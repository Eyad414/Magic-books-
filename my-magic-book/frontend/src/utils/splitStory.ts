// Splits an AI-generated story blob into `n` page-sized chunks for the on-screen
// viewer, so a "write with AI" story shows the customer's OWN text — not a theme
// template. Mirrors the backend split closely enough for a faithful preview
// (the printed PDF uses the backend's own splitter).
export function splitStoryIntoPages(text: string, n: number): string[] {
  if (n <= 0) return [];
  const cleaned = (text || '').trim();
  if (!cleaned) return Array(n).fill('');

  // Prefer paragraph breaks; otherwise fall back to sentences.
  let chunks = cleaned.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);

  // Too few: split the longest multi-sentence chunk until we reach n.
  while (chunks.length < n) {
    let idx = -1, len = -1, sents: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const s = chunks[i].split(/(?<=[.!?؟])\s+/).filter(Boolean);
      if (s.length >= 2 && chunks[i].length > len) { idx = i; len = chunks[i].length; sents = s; }
    }
    if (idx === -1) break;
    const mid = Math.ceil(sents.length / 2);
    chunks = [
      ...chunks.slice(0, idx),
      sents.slice(0, mid).join(' '),
      sents.slice(mid).join(' '),
      ...chunks.slice(idx + 1),
    ];
  }

  // Still too few (tiny story): pad with blanks so page count stays fixed.
  while (chunks.length < n) chunks.push('');

  // Too many: greedily merge the shortest adjacent pair until we reach n.
  while (chunks.length > n) {
    let at = 0, best = Infinity;
    for (let i = 0; i < chunks.length - 1; i++) {
      const l = chunks[i].length + chunks[i + 1].length;
      if (l < best) { best = l; at = i; }
    }
    chunks = [...chunks.slice(0, at), `${chunks[at]} ${chunks[at + 1]}`.trim(), ...chunks.slice(at + 2)];
  }

  return chunks.slice(0, n);
}
