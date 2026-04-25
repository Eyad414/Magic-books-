import { useEffect, useRef } from 'react';

export default function StarBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const stars = Array.from({ length: 80 }, (_, i) => {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        width: ${Math.random() * 3 + 1}px;
        height: ${Math.random() * 3 + 1}px;
        animation-delay: ${Math.random() * 5}s;
        animation-duration: ${Math.random() * 4 + 2}s;
        opacity: ${Math.random() * 0.7 + 0.1};
        background: ${i % 3 === 0 ? '#F5A623' : i % 3 === 1 ? '#6C3FC5' : '#ffffff'};
      `;
      container.appendChild(star);
      return star;
    });

    return () => stars.forEach((s) => s.remove());
  }, []);

  return <div ref={containerRef} className="stars-bg" aria-hidden="true" />;
}
