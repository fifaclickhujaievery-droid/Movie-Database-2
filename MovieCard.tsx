import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bookmark, Play, Star } from 'lucide-react';
import type { TmdbItem } from '../lib/types';
import { itemTitle, itemYear, mediaOf } from '../lib/types';
import { img } from '../lib/tmdb';
import { cn } from '../utils/cn';

/* Poster image with graceful degradation */
export function PosterImage({
  path,
  size = 'w342',
  alt,
  className,
}: {
  path: string | null | undefined;
  size?: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = img(path, size);
  if (!url || failed) {
    return (
      <div
        className={cn(
          'flex items-end bg-[linear-gradient(150deg,#191920,#0c0c0f)] p-3',
          className,
        )}
      >
        <span className="font-display text-xl leading-none tracking-wide text-zinc-500">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
      draggable={false}
    />
  );
}

interface Props {
  item: TmdbItem;
  onOpen: (item: TmdbItem) => void;
  onToggleList: (item: TmdbItem) => void;
  inList: boolean;
  width?: string;
}

export default function MovieCard({ item, onOpen, onToggleList, inList, width }: Props) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
      onClick={() => onOpen(item)}
      className={cn('group relative w-40 shrink-0 cursor-pointer md:w-[188px]', width)}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-abyss-2 ring-1 ring-white/8 transition-all duration-300 group-hover:ring-white/25 group-hover:shadow-[0_20px_40px_-18px_rgba(0,0,0,0.9)]">
        <PosterImage
          path={item.poster_path}
          alt={itemTitle(item)}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
        />

        {/* subtle hover veil */}
        <div className="absolute inset-0 bg-black/35 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* rating chip */}
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-1 text-[10px] font-bold text-amber-400 backdrop-blur-sm">
          <Star size={9} fill="currentColor" />
          {item.vote_average.toFixed(1)}
        </div>

        {/* bookmark */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleList(item);
          }}
          aria-label="Save to My List"
          className={cn(
            'absolute right-2 top-2 grid size-7 place-items-center rounded-md backdrop-blur-md transition-all',
            'bg-black/55 text-zinc-300 hover:bg-white hover:text-black md:opacity-0 md:group-hover:opacity-100',
            inList && 'bg-inferno text-white hover:bg-inferno hover:text-white md:opacity-100',
          )}
        >
          <Bookmark size={12} fill={inList ? 'currentColor' : 'none'} />
        </button>

        {/* center play affordance */}
        <div className="absolute inset-0 grid scale-90 place-items-center opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
          <span className="grid size-12 place-items-center rounded-full bg-white/95 text-black shadow-xl">
            <Play size={16} fill="currentColor" className="ml-0.5" />
          </span>
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline justify-between gap-2 px-0.5">
        <h3 className="line-clamp-1 text-[13px] font-bold text-zinc-300 transition-colors group-hover:text-white">
          {itemTitle(item)}
        </h3>
        <span className="shrink-0 text-[10px] font-semibold tabular-nums text-zinc-600">
          {itemYear(item)}
        </span>
      </div>
      <p className="px-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
        {mediaOf(item) === 'tv' ? 'Series' : 'Film'}
      </p>
    </motion.article>
  );
}
