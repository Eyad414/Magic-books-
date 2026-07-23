import SiteSettings from '../models/SiteSettings';
import { envFlag } from '../utils/envFlag';

export type ChatRole = 'user' | 'assistant';
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatSuggestion {
  /** The recommended theme id (must be one of the ready themes). Empty until confident. */
  themeId: string;
  /** Short reason, in the conversation language. */
  note: string;
}

export interface ChatResult {
  reply: string;
  suggestion: ChatSuggestion | null;
  /** Short, sanitized reason when generation fell back (no keys/secrets).
   *  Present only on failure — lets us diagnose a silent fallback in prod. */
  diag?: string;
}

/** Child details already collected in Step 1 — so the assistant never re-asks. */
export interface ChildInfo {
  name?: string;
  age?: string;
  gender?: 'male' | 'female';
}

const LANG_NAME: Record<string, string> = { ar: 'Arabic', en: 'English', he: 'Hebrew' };

/** The Gemini model that powers the wizard chat (same billing as image gen).
 *  flash-lite is fast, cheap and doesn't burn tokens "thinking" — ideal for a
 *  short guided chat. Model ids differ per backend: Vertex does NOT serve the
 *  AI-Studio "-latest" aliases, and AI Studio no longer serves `gemini-2.5-*`
 *  for new keys. Read lazily so it picks up env loaded after import.
 *  Override with STORY_CHAT_MODEL. */
function chatModel(): string {
  if (process.env.STORY_CHAT_MODEL) return process.env.STORY_CHAT_MODEL;
  return envFlag('GENAI_USE_VERTEX') ? 'gemini-2.5-flash-lite' : 'gemini-flash-lite-latest';
}

/** Load the themes a customer may actually pick (ready, non-coloring), with a
 *  name/description resolved to the conversation language. */
async function loadReadyThemes(language: string) {
  const settings = await SiteSettings.findOne();
  const themes = (settings?.themes ?? []) as any[];
  return themes
    .filter((th) => th.ready && !th.isColoring)
    .map((th) => ({
      id: th.id,
      name: (th.titles && th.titles[language]) || th.label || th.id,
      desc: (th.descriptions && th.descriptions[language]) || th.desc || '',
    }));
}

/** Pull the first balanced {...} JSON object out of a model reply. */
function extractJson(text: string): any | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Guided story-picker chat. The assistant chats with the parent (in their
 * language), learns about the child, and recommends ONE of the existing ready
 * themes. It never writes new story content — so this stays cheap (a short
 * Gemini text call per message, same billing as the image generator).
 */
export async function storyChatSuggest(
  messages: ChatMessage[],
  language: string,
  childInfo?: ChildInfo,
): Promise<ChatResult> {
  const lang = LANG_NAME[language] ? language : 'ar';
  const themes = await loadReadyThemes(lang);

  // No themes to suggest, or no Gemini configured → graceful, no crash.
  if (themes.length === 0) {
    return { reply: fallbackReply(lang), suggestion: null, diag: 'no ready themes' };
  }
  if (!envFlag('GENAI_USE_VERTEX') && !process.env.GEMINI_API_KEY) {
    return { reply: fallbackReply(lang), suggestion: null, diag: 'genai not configured' };
  }

  const themeList = themes.map((t) => `- id="${t.id}": ${t.name}${t.desc ? ` — ${t.desc}` : ''}`).join('\n');

  // The child's name/age/gender come from Step 1 — tell the model so it never re-asks.
  const known: string[] = [];
  if (childInfo?.name) known.push(`name: ${childInfo.name}`);
  if (childInfo?.age) known.push(`age: ${childInfo.age}`);
  if (childInfo?.gender) known.push(`gender: ${childInfo.gender === 'female' ? 'girl' : 'boy'}`);
  const knownBlock = known.length
    ? `\n\nYou ALREADY KNOW the child from the order form: ${known.join(', ')}. Do NOT ask for the name, age or gender again — you have them. Address the child by name where natural.`
    : '';

  const system = `You are the friendly helper of "Magic Fanoos" (الفانوس السحري), a service that makes personalised children's picture books where the child is the hero.

Your job: chat warmly with the parent and help them choose ONE story theme for their child from the AVAILABLE THEMES below. If helpful, ask at most one short question about what the child loves or their personality, then recommend the best-matching theme. Keep every reply short and warm (1–3 sentences). Never invent themes that are not in the list. Do NOT write or draft any story text — only recommend a theme.${knownBlock}

Always answer in ${LANG_NAME[lang]}.

AVAILABLE THEMES (use the exact id):
${themeList}

Reply with ONLY a JSON object (no markdown, no extra text) in this exact shape:
{"reply": "<your message to the parent, in ${LANG_NAME[lang]}>", "suggestion": {"themeId": "<one id from the list, or empty string if not confident yet>", "note": "<one short sentence why, in ${LANG_NAME[lang]}>"}}
Set themeId to "" until you are confident enough to recommend one.`;

  // Cap history so a long chat can't run up cost. Gemini uses role 'model'
  // for assistant turns.
  const contents = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-12)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content.slice(0, 1500) }],
    }));

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: 'Hi' }] });
  }

  try {
    const { genaiClient } = await import('./genaiClient');
    const ai = genaiClient();
    const res = await ai.models.generateContent({
      model: chatModel(),
      contents,
      config: {
        systemInstruction: system,
        temperature: 0.7,
        // Generous ceiling so a "thinking" model (if configured via
        // STORY_CHAT_MODEL) still has room to emit the JSON after reasoning.
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
      },
    });
    const raw = (
      (res as any).text ||
      (res.candidates?.[0]?.content?.parts ?? [])
        .map((p: any) => p.text)
        .filter(Boolean)
        .join('')
    ).trim();

    const parsed = extractJson(raw);
    if (parsed && typeof parsed.reply === 'string') {
      let suggestion: ChatSuggestion | null = null;
      const s = parsed.suggestion;
      if (s && typeof s.themeId === 'string' && s.themeId && themes.some((t) => t.id === s.themeId)) {
        suggestion = { themeId: s.themeId, note: typeof s.note === 'string' ? s.note : '' };
      }
      return { reply: parsed.reply.trim(), suggestion };
    }
    // Model didn't return JSON — still surface its words rather than fail.
    return { reply: raw || fallbackReply(lang), suggestion: null };
  } catch (err: any) {
    console.error('[StoryChatService] chat failed:', err);
    // Truncated + whitespace-collapsed; provider errors carry no credentials.
    const msg = String(err?.message || err || 'unknown').replace(/\s+/g, ' ').slice(0, 200);
    return { reply: fallbackReply(lang), suggestion: null, diag: msg };
  }
}

function fallbackReply(lang: string): string {
  if (lang === 'en') return "I'm having a little trouble right now — please pick a theme below, or try again in a moment. 🌟";
  if (lang === 'he') return 'יש לי קצת קושי כרגע — אפשר לבחור נושא למטה, או לנסות שוב עוד רגע. 🌟';
  return 'أواجه صعوبة بسيطة الآن — يمكنك اختيار قصة من الأسفل، أو المحاولة بعد لحظات. 🌟';
}
