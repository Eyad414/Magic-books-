import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, ChevronLeft } from 'lucide-react';
import { detectGender, applyGenderTokens } from '../../utils/gender';

/**
 * The one thing this shop does that a bookshop cannot, shown rather than described.
 *
 * The home page explained personalisation in prose — "اسم طفلك في كل صفحة" — and
 * a parent had to take that on trust, start the wizard and reach step 2 before
 * a single word of it was true on screen. The proof was three screens away from
 * the claim.
 *
 * It costs nothing to show. The story titles and dedications already live in
 * all three locale files with [NAME] and {masc|fem} tokens in them, and
 * applyGenderTokens is the same helper that conjugates the printed book. So
 * this renders real lines from real stories, in the visitor's own language,
 * with whatever name they type — and switching boy/girl re-conjugates the
 * Arabic in front of them, which is the part nobody believes until they see it.
 *
 * Nothing here is generated, guessed or sent anywhere: it is the book's own
 * text with one word substituted.
 */

/** Stories whose dedication reads well out of context, in all three languages. */
const SHOWN = ['space', 'zoo_adventure', 'magic_book', 'little_chef'] as const;

export default function NameMagic() {
  const { t, i18n } = useTranslation();
  const ft = useMemo(() => i18n.getFixedT(i18n.language), [i18n.language]);

  const [name, setName] = useState('');
  // Seeded from the name when it looks decisive, so a parent who types "سارة"
  // sees feminine Arabic without touching anything — and can still override,
  // because a name is a guess and the book is not.
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [storyIdx, setStoryIdx] = useState(0);

  const shownName = name.trim() || t('home.magic_placeholder_name', 'طفلك');
  const effectiveGender = gender ?? detectGender(shownName);
  const storyId = SHOWN[storyIdx];

  const fill = (key: string) => {
    const raw = (ft(`stories.${storyId}.${key}`, '') as string) || '';
    return applyGenderTokens(raw.replace(/\[NAME\]/gi, shownName), effectiveGender);
  };

  const title = fill('title');
  const dedication = fill('dedication');

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-6">
        <p className="font-arabic text-gold-500 text-xs font-bold tracking-wider mb-2">
          {t('home.magic_eyebrow', 'جرّبها الآن، قبل أي شيء')}
        </p>
        <h2 className="font-arabic font-black text-white text-2xl sm:text-3xl mb-1">
          {t('home.magic_title', 'اكتب اسم طفلك وشوفه داخل القصة')}
        </h2>
        <p className="font-arabic text-white/45 text-sm">
          {t('home.magic_sub', 'هذا نصّ الكتاب الحقيقي — نفس الكلمات التي ستُطبع.')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] items-start">
        {/* The controls */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <label htmlFor="magic-name" className="block font-arabic text-white/70 text-xs mb-1.5">
            {t('home.magic_name_label', 'اسم طفلك')}
          </label>
          <input
            id="magic-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            placeholder={t('home.magic_name_ph', 'مثال: ليان، آدم…')}
            className="magic-input !py-2 text-sm w-full mb-3"
          />

          {/* Switching this re-conjugates the Arabic, which is the whole point. */}
          <div className="flex gap-1.5 mb-3">
            {([
              { v: 'female' as const, label: `👧 ${t('admin.girl', 'بنت')}` },
              { v: 'male' as const, label: `👦 ${t('admin.boy', 'ولد')}` },
            ]).map((o) => {
              const on = effectiveGender === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setGender(o.v)}
                  className={`flex-1 min-h-[40px] rounded-xl font-arabic text-xs font-bold border transition-all ${
                    on
                      ? 'bg-gold-500/20 border-gold-500/50 text-gold-500'
                      : 'bg-white/5 border-white/10 text-white/50 hover:border-white/30'
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          <p className="font-arabic text-white/30 text-[10px] leading-relaxed">
            {t('home.magic_gender_hint', 'بدّل بين ولد وبنت وشوف كيف تتغيّر صياغة القصة كلها.')}
          </p>
        </div>

        {/* The page itself */}
        <div className="relative rounded-2xl border border-gold-500/25 bg-gradient-to-b from-gold-500/[0.07] to-transparent p-5 sm:p-7 overflow-hidden">
          {/* /70 not /40: the light theme only re-weights the gold opacities it
              has rules for, and /40 has none — it would wash out on paper.
              The guard in lightThemeCoverage caught this. */}
          <Sparkles className="absolute top-3 end-3 w-4 h-4 text-gold-500/70" aria-hidden />

          <h3 className="font-arabic font-black text-white text-lg sm:text-2xl leading-snug mb-4">
            {title}
          </h3>

          <p className="font-arabic text-white/75 text-sm sm:text-base leading-loose mb-5">
            {dedication}
          </p>

          {/* Which story the line is from — and a way to hear another one. */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/10">
            {SHOWN.map((id, i) => (
              <button
                key={id}
                type="button"
                aria-pressed={i === storyIdx}
                onClick={() => setStoryIdx(i)}
                className={`px-2.5 py-1 rounded-lg font-arabic text-[11px] border transition-colors ${
                  i === storyIdx
                    ? 'bg-gold-500/20 border-gold-500/40 text-gold-500'
                    : 'bg-white/5 border-white/10 text-white/45 hover:text-white/75'
                }`}
              >
                {t(`step2.theme_${id}`, { defaultValue: id })}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center mt-6">
        <Link
          to="/create"
          className="inline-flex items-center gap-2 min-h-[48px] px-7 rounded-2xl bg-magic-gradient text-dark-900 font-arabic font-black text-sm shadow-lg shadow-gold-500/20 hover:brightness-110 transition-all"
        >
          {t('home.magic_cta', 'اعمل الكتاب كامل لـ')} {shownName}
          <ChevronLeft className="w-4 h-4 nav-icon" />
        </Link>
      </div>
    </section>
  );
}
