import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search, TrendingUp, X } from 'lucide-react';
import type { TmdbItem } from '../lib/types';
import { mediaOf } from '../lib/types';
import { searchMulti } from '../lib/tmdb';
import MovieCard from './MovieCard';

interface Props {
  trending: TmdbItem[];
  onOpen: (item: TmdbItem) => void;
  onClose: () => void;
  onToggleList: (item: TmdbItem) => void;
  isInList: (id: number) => boolean;
}

export default function SearchOverlay({ trending, onOpen, onClose, onToggleList, isInList }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TmdbItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const s = ++seq.current;
    const t = setTimeout(() => {
      searchMulti(q)
        .then((p) => {
          if (seq.current !== s) return;
          setResults(
            p.results
              .filter((r) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
              .slice(0, 24),
          );
        })
        .catch(() => seq.current === s && setResults([]))
        .finally(() => seq.current === s && setSearching(false));
    }, 380);
    return () => clearTimeout(t);
  }, [query]);

  const pool = useMemo(
    () => trending.filter((t) => t.poster_path).slice(0, 12),
    [trending],
  );

  const showingSearch = query.trim().length > 0;
  const grid = showingSearch ? results ?? [] : pool;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 bg-abyss/92 backdrop-blur-2xl"
    >
      <div className="mx-auto flex h-full max-w-[1400px] flex-col px-5 pb-10 pt-6 md:px-10">
        {/* top bar */}
        <div className="flex items-center gap-4">
          <div className="flex flex-1 items-center gap-4 border-b-2 border-white/15 pb-4 transition-colors focus-within:border-inferno">
            <Search size={26} className="shrink-0 text-inferno" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies & series…"
              className="w-full bg-transparent font-display text-3xl tracking-[0.06em] text-white placeholder:text-zinc-700 focus:outline-none md:text-5xl"
            />
            {searching && <Loader2 size={22} className="shrink-0 animate-spin text-zinc-500" />}
          </div>
          <button
            onClick={onClose}
            aria-label="Close search"
            className="grid size-12 shrink-0 place-items-center rounded-full border border-white/15 text-zinc-300 transition-all hover:rotate-90 hover:border-inferno hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* body */}
        <div className="scrollbar-hide mt-8 flex-1 overflow-y-auto">
          <div className="mb-5 flex items-center gap-3">
            {showingSearch ? (
              <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-zinc-500">
                {searching ? 'Searching…' : results ? `${results.length} results for “${query.trim()}”` : ''}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.3em] text-zinc-500">
                <TrendingUp size={13} className="text-inferno" /> Trending right now
              </p>
            )}
          </div>

          {showingSearch && !searching && results && results.length === 0 ? (
            <div className="grid place-items-center py-24 text-center">
              <p className="font-display text-4xl tracking-widest text-zinc-600">NO MATCHES</p>
              <p className="mt-3 max-w-xs text-sm text-zinc-500">
                Nothing found for “{query.trim()}”. Check the spelling or try another title.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {grid.map((item) => (
                <MovieCard
                  key={`${mediaOf(item)}-${item.id}`}
                  item={item}
                  onOpen={onOpen}
                  onToggleList={onToggleList}
                  inList={isInList(item.id)}
                  width="w-full"
                />
              ))}
            </div>
          )}
        </div>

        <p className="pt-5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-700">
          Press ESC to close — results by TMDB
        </p>
      </div>
    </motion.div>
  );
}
