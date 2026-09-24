import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Flame, Info, Play, Star } from 'lucide-react';
import type { TmdbItem } from '../lib/types';
import { itemTitle, itemYear, mediaOf } from '../lib/types';
import { backdrop } from '../lib/tmdb';

interface Props {
  items: TmdbItem[];
  loading: boolean;
  onDetails: (item: TmdbItem) => void;
  onTrailer: (item: TmdbItem) => void;
}

const SLIDES = 6;
const DUR = 8000;

export default function Hero({ items, loading, onDetails, onTrailer }: Props) {
  const slides = items.slice(0, SLIDES);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    if (slides.length) setIdx((i) => (i + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(next, DUR);
    return () => clearInterval(t);
  }, [next, paused, slides.length]);

  if (loading || slides.length === 0) {
    return (
      <div className="relative h-[100svh] min-h-[620px]">
        <div className="skeleton absolute inset-0" />
        <div className="absolute bottom-[16%] left-5 right-5 space-y-4 md:left-10 md:right-auto md:w-[46rem]">
          <div className="skeleton h-4 w-40 rounded-full" />
          <div className="skeleton h-20 w-3/4 rounded-2xl" />
          <div className="skeleton h-4 w-full max-w-xl rounded-full" />
          <div className="skeleton h-4 w-2/3 max-w-lg rounded-full" />
        </div>
      </div>
    );
  }

  const cur = slides[Math.min(idx, slides.length - 1)];

  return (
    <section
      id="top"
      className="relative h-[100svh] min-h-[620px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Backdrops */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={cur.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img
            src={backdrop(cur.backdrop_path)}
            alt=""
            className="ken-burns h-full w-full object-cover"
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      {/* Cinematic gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-abyss via-abyss/45 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/10 to-black/40" />

      {/* Ghost index number — right side */}
      <div className="pointer-events-none absolute -right-4 bottom-14 hidden select-none font-display text-[26rem] leading-none text-stroke-faint xl:block">
        {String(idx + 1).padStart(2, '0')}
      </div>

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 pb-16 md:pb-20">
        <div className="mx-auto w-full max-w-[1500px] px-5 md:px-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={cur.id}
              initial="hidden"
              animate="show"
              exit="leave"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
                leave: { opacity: 0, y: -24, transition: { duration: 0.35 } },
              }}
              className="max-w-3xl"
            >
              <motion.div
                variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
                className="mb-4 flex items-center gap-3"
              >
                <span className="flex items-center gap-1.5 rounded-full bg-inferno/15 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-inferno ring-1 ring-inferno/40">
                  <Flame size={12} strokeWidth={2.5} /> #{idx + 1} Trending
                </span>
                <span className="rounded-full border border-white/20 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-300">
                  {mediaOf(cur) === 'tv' ? 'Series' : 'Film'}
                </span>
              </motion.div>

              <motion.h1
                variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } } }}
                className="font-display text-[17vw] uppercase leading-[0.88] tracking-[0.02em] text-white drop-shadow-[0_8px_40px_rgba(0,0,0,0.65)] sm:text-7xl md:text-8xl xl:text-[7.5rem]"
              >
                {itemTitle(cur)}
              </motion.h1>

              <motion.div
                variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
                className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] font-bold text-zinc-300"
              >
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Star size={14} fill="currentColor" />
                  {cur.vote_average.toFixed(1)}
                </span>
                <span className="text-zinc-600">•</span>
                <span>{itemYear(cur)}</span>
                <span className="text-zinc-600">•</span>
                <span className="rounded border border-white/25 px-1.5 py-0.5 text-[10px] tracking-widest text-zinc-400">4K</span>
                <span className="rounded border border-white/25 px-1.5 py-0.5 text-[10px] tracking-widest text-zinc-400">HDR</span>
              </motion.div>

              <motion.p
                variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
                className="mt-4 line-clamp-3 max-w-xl text-[15px] leading-relaxed text-zinc-300/90 md:text-base"
              >
                {cur.overview}
              </motion.p>

              <motion.div
                variants={{ hidden: { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <button
                  onClick={() => onTrailer(cur)}
                  className="group flex items-center gap-2.5 rounded-full bg-inferno px-8 py-3.5 text-[13px] font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_10px_32px_-12px_rgba(255,60,46,0.55)] transition-all hover:scale-[1.04] hover:bg-inferno-soft active:scale-95"
                >
                  <Play size={16} fill="currentColor" className="transition-transform group-hover:scale-125" />
                  Trailer
                </button>
                <button
                  onClick={() => onDetails(cur)}
                  className="flex items-center gap-2.5 rounded-full border border-white/20 bg-white/[0.06] px-8 py-3.5 text-[13px] font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-md transition-all hover:border-white/50 hover:bg-white/[0.12] active:scale-95"
                >
                  <Info size={16} />
                  Details
                </button>
              </motion.div>
            </motion.div>
          </AnimatePresence>

          {/* Progress bars */}
          <div className="mt-12 flex max-w-md gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setIdx(i)}
                aria-label={`Go to ${itemTitle(s)}`}
                className="group h-6 flex-1"
              >
                <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/15 transition-colors group-hover:bg-white/30">
                  {i === idx && (
                    <motion.div
                      key={`bar-${idx}-${paused}`}
                      initial={{ width: 0 }}
                      animate={{ width: paused ? '0%' : '100%' }}
                      transition={{ duration: DUR / 1000, ease: 'linear' }}
                      className="h-full rounded-full bg-inferno"
                    />
                  )}
                  {i < idx && <div className="h-full w-full bg-white/40" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
