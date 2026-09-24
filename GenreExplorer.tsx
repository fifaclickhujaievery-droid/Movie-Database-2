import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clapperboard, Compass, Loader2, MonitorPlay } from 'lucide-react';
import type { MediaType, TmdbItem } from '../lib/types';
import { MOVIE_GENRES, TV_GENRES, discover, fallbackPage } from '../lib/tmdb';
import { usePaged } from '../lib/hooks';
import MovieCard from './MovieCard';
import { cn } from '../utils/cn';

interface Props {
  onOpen: (item: TmdbItem) => void;
  onToggleList: (item: TmdbItem) => void;
  isInList: (id: number) => boolean;
}

export default function GenreExplorer({ onOpen, onToggleList, isInList }: Props) {
  const [type, setType] = useState<MediaType>('movie');
  const [genre, setGenre] = useState<number | null>(null);

  const genres = type === 'movie' ? MOVIE_GENRES : TV_GENRES;
  const fb = useMemo(() => fallbackPage(type === 'movie' ? 'movies' : 'tv').results, [type]);

  const { items, loading, loadMore, loadingMore, hasMore } = usePaged<TmdbItem>(
    (page) =>
      discover(type, genre, page).then((p) => ({
        ...p,
        results: p.results.map((r) => ({ ...r, media_type: type })),
      })),
    [type, genre],
    fb,
  );

  return (
    <section id="browse" className="relative py-10 md:py-14">
      <div className="mx-auto max-w-[1500px] px-5 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.3em] text-inferno">
            <Compass size={12} /> Explore the catalogue
          </p>
          <h2 className="font-display text-3xl tracking-[0.06em] text-white md:text-4xl">
            DISCOVER BY GENRE
          </h2>
        </motion.div>

        {/* type switch */}
        <div className="mt-6 flex w-fit rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(
            [
              { key: 'movie', label: 'Movies', icon: Clapperboard },
              { key: 'tv', label: 'Series', icon: MonitorPlay },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setType(key);
                setGenre(null);
              }}
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] transition-all duration-300',
                type === key ? 'bg-inferno text-white shadow-[0_6px_20px_-6px_rgba(255,60,46,0.7)]' : 'text-zinc-400 hover:text-white',
              )}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* genre chips */}
        <div className="scrollbar-hide -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <Chip active={genre === null} onClick={() => setGenre(null)} label="All" />
          {genres.map((g) => (
            <Chip key={g.id} active={genre === g.id} onClick={() => setGenre(g.id)} label={g.name} />
          ))}
        </div>

        {/* grid */}
        {loading ? (
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[2/3] w-full rounded-xl" />
                <div className="skeleton mt-3 h-3 w-2/3 rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-16 grid place-items-center py-20 text-center">
            <p className="font-display text-3xl tracking-widest text-zinc-600">NOTHING FOUND</p>
            <p className="mt-2 text-sm text-zinc-500">Try a different genre.</p>
          </div>
        ) : (
          <motion.div
            key={`${type}-${genre}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          >
            {items.map((item) => (
              <MovieCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                onToggleList={onToggleList}
                inList={isInList(item.id)}
                width="w-full"
              />
            ))}
          </motion.div>
        )}

        {hasMore && !loading && items.length > 0 && (
          <div className="mt-10 flex justify-center">
            <button
              onClick={() => loadMore()}
              disabled={loadingMore}
              className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-9 py-3.5 text-[12px] font-extrabold uppercase tracking-[0.2em] text-white transition-all hover:border-inferno hover:bg-inferno/10 disabled:opacity-60"
            >
              {loadingMore && <Loader2 size={15} className="animate-spin" />}
              {loadingMore ? 'Loading' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-300',
        active
          ? 'border-inferno bg-inferno text-white shadow-[0_6px_18px_-6px_rgba(255,60,46,0.7)]'
          : 'border-white/12 text-zinc-400 hover:border-white/35 hover:text-white',
      )}
    >
      {label}
    </button>
  );
}
