// ─── BookBrandFooter ──────────────────────────────────────────────────────────
// Shared brand strip used at the bottom of every book page so the customer
// always sees the Magic Fanoos identity, no matter which page they're on.
//
// Two variants:
//   variant="cover" — glossy gold-on-dark used on the front cover
//   variant="page"  — subtle gold pinstripe used on inner pages
//
// Logo source: /logo.png (already in frontend/public/). When the real logo
// lands next week, drop the new file at the same path; no code change needed.

interface BookBrandFooterProps {
  variant?: 'cover' | 'page';
  pageNumber?: number;
}

export default function BookBrandFooter({ variant = 'page', pageNumber }: BookBrandFooterProps) {
  return (
    <div className={`bbf bbf--${variant}`} aria-hidden="true">
      <div className="bbf-inner">
        <img src="/logo.png" alt="" className="bbf-logo" />
        <span className="bbf-name">Magic Fanoos</span>
        <span className="bbf-dot">•</span>
        <span className="bbf-url">MagicFanoos.com</span>
      </div>
      {typeof pageNumber === 'number' && (
        <span className="bbf-page">{pageNumber}</span>
      )}

      <style>{`
        .bbf {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          font-family: 'Noto Kufi Arabic', 'Inter', sans-serif;
        }

        .bbf-inner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          letter-spacing: 0.04em;
        }
        .bbf-logo {
          width: 22px;
          height: 22px;
          object-fit: contain;
          filter: drop-shadow(0 0 6px rgba(212,169,55,0.55));
        }
        .bbf-name {
          font-size: 0.78rem;
          font-weight: 800;
        }
        .bbf-dot { opacity: 0.5; font-size: 0.7rem; }
        .bbf-url { font-size: 0.72rem; opacity: 0.8; }
        .bbf-page {
          font-size: 0.7rem;
          font-weight: 700;
          opacity: 0.7;
          font-variant-numeric: tabular-nums;
        }

        /* Cover variant — glossy gold on dark, edge-to-edge bar */
        .bbf--cover {
          background: linear-gradient(90deg, rgba(10,22,40,0.92) 0%, rgba(10,22,40,0.72) 50%, rgba(10,22,40,0.92) 100%);
          border-top: 1px solid rgba(212,169,55,0.35);
          color: #f3d98f;
          backdrop-filter: blur(10px);
        }

        /* Inner page variant — quiet pinstripe */
        .bbf--page {
          background: linear-gradient(90deg, transparent 0%, rgba(212,169,55,0.05) 50%, transparent 100%);
          border-top: 1px solid rgba(212,169,55,0.18);
          color: rgba(212,169,55,0.75);
        }
      `}</style>
    </div>
  );
}
