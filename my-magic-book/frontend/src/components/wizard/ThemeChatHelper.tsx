import { useRef, useState, useEffect } from 'react';
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { publicApi, type ChatMessage } from '../../api/publicApi';

interface Props {
  language: string;
  /** Child details already collected in Step 1 — so the assistant doesn't re-ask. */
  childInfo?: { name?: string; age?: string; gender?: 'male' | 'female' };
  /** Apply the recommended theme to the wizard. */
  onApply: (themeId: string) => void;
  /** Resolve a theme id to its display name (undefined → theme not selectable). */
  resolveThemeName: (themeId: string) => string | undefined;
}

/**
 * A friendly, collapsible AI helper for Step 2. The parent describes their
 * child; Claude recommends ONE of the existing ready themes (it never writes
 * story text — so the only cost is a short chat call per message). When it
 * recommends a theme the parent can apply it with one tap.
 */
export default function ThemeChatHelper({ language, childInfo, onApply, resolveThemeName }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [convo, setConvo] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestionId, setSuggestionId] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const greeting = t('step2.chat_greeting');

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [convo, loading, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const nextConvo: ChatMessage[] = [...convo, { role: 'user', content: text }];
    setConvo(nextConvo);
    setInput('');
    setLoading(true);
    try {
      const res = await publicApi.storyChat({ messages: nextConvo, language, childInfo });
      setConvo([...nextConvo, { role: 'assistant', content: res.reply }]);
      setSuggestionId(res.suggestion?.themeId || '');
    } catch {
      setConvo([...nextConvo, { role: 'assistant', content: t('step2.chat_error') }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedName = suggestionId ? resolveThemeName(suggestionId) : undefined;

  const apply = () => {
    if (!suggestionId) return;
    onApply(suggestionId);
  };

  return (
    <div className="rounded-2xl border border-magic-500/30 bg-gradient-to-br from-magic-500/10 to-transparent overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3.5 text-right"
      >
        <span className="flex-shrink-0 w-9 h-9 rounded-full bg-magic-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-gold-500" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block font-arabic font-bold text-white text-sm">{t('step2.chat_title')}</span>
          <span className="block font-arabic text-white/50 text-xs truncate">{t('step2.chat_cta')}</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
      </button>

      {open && (
        <div className="px-3 pb-3">
          {/* Messages */}
          <div
            ref={scrollRef}
            className="max-h-64 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-dark-800/50 border border-white/5"
          >
            <Bubble role="assistant" text={greeting} />
            {convo.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-white/40 font-arabic text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t('step2.chat_thinking')}
              </div>
            )}
          </div>

          {/* Apply suggestion */}
          {suggestedName && (
            <button
              type="button"
              onClick={apply}
              className="mt-2.5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-500 text-dark-900 font-arabic font-bold text-sm hover:brightness-110 transition-all"
            >
              <Wand2 className="w-4 h-4" />
              {t('step2.chat_apply').replace('{name}', suggestedName)}
            </button>
          )}

          {/* Input */}
          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              placeholder={t('step2.chat_placeholder')}
              className="magic-input flex-1 !mt-0"
              disabled={loading}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-magic-500/80 hover:bg-magic-500 disabled:opacity-40 text-white flex items-center justify-center transition-all"
              aria-label={t('step2.chat_send')}
            >
              <Send className="w-4 h-4 nav-icon" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] px-3 py-2 rounded-2xl font-arabic text-xs leading-relaxed whitespace-pre-wrap ${
          isUser ? 'bg-white/10 text-white/90' : 'bg-magic-500/20 text-white'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
