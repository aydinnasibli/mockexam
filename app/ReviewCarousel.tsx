'use client';

import { useState, useEffect } from 'react';

/*
 * The only interactive part of the landing page. It lives in its own client
 * component so the rest of the page — hero, categories, method, CTA — can stay
 * a server component and ship no JavaScript.
 */

interface Review {
  initials: string;
  quote: string;
  name: string;
  detail: string;
  /** Substring of `quote` rendered in the accent colour. */
  accent: string;
}

const reviews: Review[] = [
  {
    initials: "AM",
    quote: "On səkkiz dəfə cəhd etdim. Sayı eyni qalır, lakin hər səhvim üçün yeni izahat verən başqa platforma tapmadım. Bal 200 vahid artdı.",
    name: "Aysel Məmmədova",
    detail: "SAT 1480 · Boğaziçi Universiteti",
    accent: "hər səhvim üçün yeni izahat",
  },
  {
    initials: "KH",
    quote: "IELTS üçün altı ay hazırlandım amma nəticə yaxşı deyildi. Buraya keçdikdən sonra iki ayda 6.0-dan 7.5-ə çıxdım. Band analizi hər şeyi dəyişdi.",
    name: "Kərim Hüseynov",
    detail: "IELTS 7.5 · Edinburq Universiteti",
    accent: "iki ayda 6.0-dan 7.5-ə çıxdım",
  },
  {
    initials: "NQ",
    quote: "Adaptive suallar mənim nəyə görə yanıldığımı dəqiq göstərdi. TOEFL Reading bölməsini tam yenidən öyrəndim — nəticə 105 oldu.",
    name: "Nigar Quliyeva",
    detail: "TOEFL 105 · Amsterdam",
    accent: "nəyə görə yanıldığımı dəqiq göstərdi",
  },
  {
    initials: "TA",
    quote: "SAT Math modullarını dörd dəfə keçdim. Hər dəfə fərqli zəif nöqtə çıxdı. Platforma olmadan 1540 balı görmək mümkün olmazdı.",
    name: "Tural Əliyev",
    detail: "SAT 1540 · MIT",
    accent: "Hər dəfə fərqli zəif nöqtə çıxdı",
  },
];

export default function ReviewCarousel() {
  const [reviewIndex, setReviewIndex] = useState(0);
  const current = reviews[reviewIndex];

  useEffect(() => {
    const t = setInterval(() => setReviewIndex(i => (i + 1) % reviews.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-14">
        <div>
          <div className="eyebrow mb-3">Tələbə rəyləri</div>
          {/*
            The dot is 6px for visual reasons, but the *button* is 24px so
            it meets the WCAG 2.5.8 minimum target size. The dot itself is
            a child span; the button is transparent padding around it.
          */}
          <div className="flex items-center mt-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setReviewIndex(i)}
                aria-label={`Rəy ${i + 1}`}
                aria-current={i === reviewIndex ? 'true' : undefined}
                style={{
                  width: 24,
                  height: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  padding: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    width: i === reviewIndex ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === reviewIndex ? 'var(--color-ink)' : 'var(--color-rule)',
                    transition: 'width 0.2s ease, background 0.2s ease',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setReviewIndex(i => (i - 1 + reviews.length) % reviews.length)}
            aria-label="Əvvəlki rəy"
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ border: "1px solid var(--color-rule)", color: "var(--color-ink-soft)", background: "transparent" }}
          >
            ←
          </button>
          <button
            onClick={() => setReviewIndex(i => (i + 1) % reviews.length)}
            aria-label="Növbəti rəy"
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ border: "1px solid var(--color-rule)", color: "var(--color-ink-soft)", background: "transparent" }}
          >
            →
          </button>
        </div>
      </div>

      <blockquote
        className="font-display font-normal text-ink text-xl md:text-2xl lg:text-3xl leading-snug tracking-tight mb-10 max-w-205"
      >
        {current.quote.split(current.accent).map((part, i, parts) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span style={{ color: "var(--color-accent)" }}>{current.accent}</span>
            )}
          </span>
        ))}
      </blockquote>

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
          style={{
            background: "linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-3) 100%)",
            color: "var(--color-ink-mute)",
          }}
        >
          {current.initials}
        </div>
        <div>
          <div className="text-sm font-medium text-ink">{current.name}</div>
          <div className="text-sm">{current.detail}</div>
        </div>
      </div>
    </>
  );
}
