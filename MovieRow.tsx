import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TmdbItem } from '../lib/types';
import MovieCard, { PosterImage } from './MovieCard';
import { itemTitle, itemYear } from '../lib/types';
import { cn } from '../utils/cn';

interface Props {
  id?: string;
  title: string;
  kicker?: string;
  items: TmdbItem[];
  loading?: boolean;
  onOpen: (item: TmdbItem) => void;
  onToggleList: (item: TmdbItem) => void;
  isInList: (id: number) => boolean;
  ranked?: boolean;
}

export default function MovieRow({
  id,
  title,
  kicker,
  items,
  loading,
  onOpen,
  onToggleList,
  isInList,
  ranked,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<'start' | 'mid' | 'end'>('start');

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const atStart = el.scrollLeft < 40;
    const atEnd = el.scrollLeft > el.scrollWidth - el.clientWidth - 40;
    setEdge(atStart ? 'start' : atEnd ? 'end' : 'mid');
  };

  const list = ranked ? items.slice(0, 10) : items;

  return (
    <section id={id} className="group/row relative py-6 md:py-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-[1500px] px-5 md:px-10"
      >
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            {kicker && (
              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.3em] text-inferno">{kicker}</p>
            )}
            <h2 className="font-display text-3xl tracking-[0.06em] text-white md:text-4xl">
              {title}
            </h2>
          </div>
          <div className="hidden gap-2 md:flex">
            <button
              onClick={() => scrollBy(-1)}
              disabled={edge === 'start'}
              aria-label="Scroll left"
              className="grid size-10 place-items-center rounded-full border border-white/12 text-zinc-400 transition-all hover:border-inferno hover:text-white disabled:opacity-25 disabled:hover:border-white/12 disabled:hover:text-zinc-400"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scrollBy(1)}
              disabled={edge === 'end'}
              aria-label="Scroll right"
              className="grid size-10 place-items-center rounded-full border border-white/12 text-zinc-400 transition-all hover:border-inferno hover:text-white disabled:opacity-25 disabled:hover:border-white/12 disabled:hover:text-zinc-400"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </motion.div>

      <div
        ref={scroller}
        onScroll={onScroll}
        className="scrollbar-hide flex snap-x gap-4 overflow-x-auto px-5 pb-2 md:gap-5 md:px-10"
        style={{ scrollPaddingInline: '2.5rem' }}
      >
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={cn('shrink-0 snap-start', ranked && 'pl-14 md:pl-20')}>
                <div className="skeleton aspect-[2/3] w-40 rounded-xl md:w-[188px]" />
                <div className="skeleton mt-3 h-3 w-24 rounded-full" />
              </div>
            ))
          : list.map((item, i) =>
              ranked ? (
                <RankedCard key={item.id} item={item} rank={i + 1} onOpen={onOpen} />
              ) : (
                <div key={item.id} className="snap-start">
                  <MovieCard
                    item={item}
                    onOpen={onOpen}
                    onToggleList={onToggleList}
                    inList={isInList(item.id)}
                  />
                </div>
              ),
            )}
      </div>
    </section>
  );
}

/* ---- Ranked card with giant ghost numeral ---- */
function RankedCard({
  item,
  rank,
  onOpen,
}: {
  item: TmdbItem;
  rank: number;
  onOpen: (item: TmdbItem) => void;
}) {
  return (
    <motion.button
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 350, damping: 24 }}
      onClick={() => onOpen(item)}
      className="group relative flex shrink-0 snap-start items-end pl-14 text-left md:pl-[76px]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-[-14px] left-0 select-none font-display text-[8rem] leading-[0.75] text-stroke transition-all duration-300 group-hover:[-webkit-text-stroke-color:rgba(255,60,46,0.55)] md:text-[11rem]"
      >
        {rank}
      </span>
      <div className="relative w-36 md:w-[164px]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-abyss-2 ring-1 ring-white/10 transition-shadow duration-300 group-hover:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9)] group-hover:ring-inferno/50">
          <PosterImage
            path={item.poster_path}
            alt={itemTitle(item)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="mt-2 line-clamp-1 text-[12px] font-bold text-zinc-300">{itemTitle(item)}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          {itemYear(item)}
        </p>
      </div>
    </motion.button>
  );
}
