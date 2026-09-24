import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Clock, ExternalLink, MonitorPlay, Play, Star, Tv, X } from 'lucide-react';
import type { ItemDetail, MediaType, TmdbItem, WatchProvider } from '../lib/types';
import { itemTitle, itemYear } from '../lib/types';
import { backdrop, getDetail, img, trailerKey } from '../lib/tmdb';
import { PosterImage } from './MovieCard';
import { cn } from '../utils/cn';

const WATCH_COUNTRIES = [
  { code: 'US', label: 'USA' },
  { code: 'GB', label: 'UK' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'IN', label: 'India' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'ES', label: 'Spain' },
  { code: 'JP', label: 'Japan' },
  { code: 'KR', label: 'S. Korea' },
  { code: 'BR', label: 'Brazil' },
];

export interface SelectedRef {
  id: number;
  type: MediaType;
  seed: TmdbItem;
}

interface Props {
  selected: SelectedRef;
  onClose: () => void;
  onOpen: (item: TmdbItem) => void;
  onToggleList: (item: TmdbItem) => void;
  inList: boolean;
  autoplay?: boolean;
}

const fmtMoney = (n?: number) =>
  n && n > 0 ? `$${n.toLocaleString('en-US')}` : '—';

export default function DetailModal({ selected, onClose, onOpen, onToggleList, inList, autoplay }: Props) {
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(!!autoplay);
  const [country, setCountry] = useState('US');
  const watchRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let alive = true;
    setDetail(null);
    setTrailerOpen(!!autoplay);
    getDetail(selected.type, selected.id)
      .then((d) => alive && setDetail(d))
      .catch(() => alive && setDetail(null));
    return () => {
      alive = false;
    };
  }, [selected.id, selected.type, autoplay]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const seed = selected.seed;
  const d = detail;
  const title = itemTitle(d ?? seed);
  const year = itemYear(d ?? seed);
  const trailer = useMemo(() => trailerKey(d), [d]);
  const cast = (d?.credits?.cast ?? []).filter((c) => c.profile_path).slice(0, 14);
  const similar = (d?.similar?.results ?? [])
    .filter((s) => s.poster_path)
    .slice(0, 12)
    .map((s) => ({ ...s, media_type: selected.type }));

  const runtime =
    selected.type === 'movie'
      ? d?.runtime
        ? `${Math.floor(d.runtime / 60)}h ${d.runtime % 60}m`
        : null
      : d?.number_of_seasons
        ? `${d.number_of_seasons} Season${d.number_of_seasons > 1 ? 's' : ''}`
        : null;

  const watch = d?.['watch/providers']?.results?.[country];
  const watchGroups: { label: string; list: WatchProvider[] }[] = watch
    ? (
        [
          { label: 'Stream', list: watch.flatrate },
          { label: 'Free', list: watch.ads ?? watch.free },
          { label: 'Rent', list: watch.rent },
          { label: 'Buy', list: watch.buy },
        ] as const
      )
        .filter((g) => (g.list ?? []).length > 0)
        .map((g) => ({ label: g.label, list: [...(g.list ?? [])].sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99)).slice(0, 8) }))
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 60, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative mx-auto my-4 w-[95%] max-w-5xl overflow-hidden rounded-2xl bg-abyss-2 ring-1 ring-white/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] md:my-10"
      >
        {/* ---------- HERO ---------- */}
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <AnimatePresence mode="wait">
            {trailerOpen && trailer ? (
              <motion.iframe
                key="trailer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={`https://www.youtube-nocookie.com/embed/${trailer}?autoplay=1&rel=0`}
                title={`${title} trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <img
                  src={backdrop(d?.backdrop_path ?? seed.backdrop_path)}
                  alt={title}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-abyss-2 via-abyss-2/20 to-black/30" />
                {(trailer || !d) && (
                  <button
                    onClick={() => setTrailerOpen(true)}
                    disabled={!trailer && !!d}
                    className="group absolute inset-0 grid place-items-center"
                    aria-label="Play trailer"
                  >
                    <span className="grid size-20 place-items-center rounded-full bg-inferno/90 text-white shadow-[0_0_60px_rgba(255,60,46,0.5)] ring-1 ring-white/25 backdrop-blur transition-transform duration-300 group-hover:scale-110">
                      <Play size={26} fill="currentColor" className="ml-1" />
                    </span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* close */}
          <button
            onClick={onClose}
            aria-label="Close details"
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-black/60 text-zinc-200 ring-1 ring-white/15 backdrop-blur transition-all hover:rotate-90 hover:bg-inferno hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* ---------- BODY ---------- */}
        <div className="relative px-5 pb-10 md:px-10">
          {/* floating poster + headline */}
          <div className="-mt-16 flex items-end gap-6 md:-mt-24 md:gap-8">
            <div className="hidden w-40 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] sm:block md:w-48">
              <PosterImage
                path={d?.poster_path ?? seed.poster_path}
                alt={title}
                size="w342"
                className="aspect-[2/3] w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="mb-2 flex items-center gap-2.5 text-[10px] font-extrabold uppercase tracking-[0.24em] text-inferno">
                {selected.type === 'tv' ? (
                  <span className="flex items-center gap-1.5"><Tv size={12} /> Series</span>
                ) : (
                  <span className="flex items-center gap-1.5"><Play size={12} fill="currentColor" /> Film</span>
                )}
                {d?.status && <span className="text-zinc-500">• {d.status}</span>}
              </div>
              <h2 className="font-display text-4xl leading-[0.92] tracking-[0.03em] text-white md:text-6xl">
                {title}
              </h2>
              {d?.tagline && <p className="mt-2 text-sm italic text-zinc-400">“{d.tagline}”</p>}
            </div>
          </div>

          {/* meta + actions */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3.5 py-2 text-sm font-extrabold text-amber-400 ring-1 ring-amber-400/30">
              <Star size={15} fill="currentColor" />
              {(d ?? seed).vote_average.toFixed(1)}
              <span className="text-xs font-semibold text-amber-400/60">/ 10</span>
            </span>
            <span className="text-sm font-bold text-zinc-300">{year}</span>
            {runtime && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-300">
                <Clock size={14} className="text-zinc-500" /> {runtime}
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              {(d?.genres ?? []).map((g) => (
                <span
                  key={g.id}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300"
                >
                  {g.name}
                </span>
              ))}
            </div>
            <div className="ml-auto flex gap-2.5">
              <button
                onClick={() => watchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-black transition-all hover:scale-105 hover:bg-inferno hover:text-white active:scale-95"
              >
                <MonitorPlay size={13} /> Watch Now
              </button>
              {trailer && !trailerOpen && (
                <button
                  onClick={() => setTrailerOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-inferno px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white transition-all hover:scale-105 hover:bg-inferno-soft active:scale-95"
                >
                  <Play size={13} fill="currentColor" /> Trailer
                </button>
              )}
              <button
                onClick={() => onToggleList(d ?? seed)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-all active:scale-95',
                  inList
                    ? 'border-inferno bg-inferno/15 text-inferno'
                    : 'border-white/20 text-white hover:border-white/50',
                )}
              >
                <Bookmark size={13} fill={inList ? 'currentColor' : 'none'} />
                {inList ? 'Saved' : 'My List'}
              </button>
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-zinc-300/90">
            {d?.overview || seed.overview || 'No synopsis available for this title yet.'}
          </p>

          {/* stats */}
          {d && (
            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/8 ring-1 ring-white/8 sm:grid-cols-4">
              <Stat label="Rating" value={`${d.vote_average.toFixed(1)} / 10`} />
              <Stat
                label="Votes"
                value={d.vote_count ? `${(d.vote_count / 1000).toFixed(1)}k` : '—'}
              />
              {selected.type === 'movie' ? (
                <>
                  <Stat label="Budget" value={fmtMoney(d.budget)} />
                  <Stat label="Revenue" value={fmtMoney(d.revenue)} />
                </>
              ) : (
                <>
                  <Stat label="Seasons" value={d.number_of_seasons ? String(d.number_of_seasons) : '—'} />
                  <Stat label="Episodes" value={d.number_of_episodes ? String(d.number_of_episodes) : '—'} />
                </>
              )}
            </div>
          )}

          {/* loading shimmer if detail pending */}
          {!d && (
            <div className="mt-8 space-y-3">
              <div className="skeleton h-3 w-2/3 rounded-full" />
              <div className="skeleton h-24 w-full rounded-xl" />
            </div>
          )}

          {/* where to watch — official provider links via TMDB/JustWatch */}
          {d && (
            <section ref={watchRef} className="mt-10 scroll-mt-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <h3 className="flex items-center gap-2.5 font-display text-2xl tracking-[0.08em] text-zinc-200">
                  <MonitorPlay size={20} className="text-inferno" /> WHERE TO WATCH
                </h3>
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-zinc-600">
                    Region
                  </span>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="cursor-pointer rounded-full border border-white/15 bg-abyss px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-200 transition-colors hover:border-inferno focus:border-inferno focus:outline-none"
                  >
                    {WATCH_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-abyss">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {watchGroups.length > 0 ? (
                <div className="space-y-4 rounded-xl border border-white/8 bg-white/[0.02] p-5 md:p-6">
                  {watchGroups.map((g) => (
                    <div key={g.label} className="flex flex-wrap items-center gap-x-6 gap-y-3">
                      <span className="w-14 shrink-0 text-[10px] font-extrabold uppercase tracking-[0.26em] text-inferno">
                        {g.label}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {g.list.map((p) => (
                          <a
                            key={p.provider_id}
                            href={watch?.link}
                            target="_blank"
                            rel="noreferrer"
                            title={`Watch on ${p.provider_name}`}
                            className="group flex items-center gap-2.5 rounded-full border border-white/10 bg-abyss py-1.5 pl-1.5 pr-4 transition-all hover:-translate-y-0.5 hover:border-inferno/60"
                          >
                            <img
                              src={img(p.logo_path, 'w92')}
                              alt={p.provider_name}
                              loading="lazy"
                              className="size-8 rounded-full object-cover ring-1 ring-white/10"
                            />
                            <span className="text-[12px] font-bold text-zinc-300 transition-colors group-hover:text-white">
                              {p.provider_name}
                            </span>
                            <ExternalLink
                              size={11}
                              className="text-zinc-600 transition-colors group-hover:text-inferno"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-700">
                    Links open the official provider — streaming data by JustWatch via TMDB
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/12 px-6 py-8 text-center">
                  <p className="text-sm font-bold text-zinc-400">
                    No streaming offers reported in{' '}
                    {WATCH_COUNTRIES.find((c) => c.code === country)?.label ?? country} yet.
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-600">
                    Try switching the region — availability changes by country.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* cast */}
          {cast.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-4 font-display text-2xl tracking-[0.08em] text-zinc-200">TOP CAST</h3>
              <div className="scrollbar-hide -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
                {cast.map((c) => (
                  <div key={c.id} className="w-24 shrink-0 text-center">
                    <div className="mx-auto size-20 overflow-hidden rounded-full ring-2 ring-white/10">
                      <img
                        src={img(c.profile_path, 'w185')}
                        alt={c.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="mt-2.5 line-clamp-1 text-[11px] font-bold text-zinc-200">{c.name}</p>
                    <p className="line-clamp-1 text-[10px] text-zinc-500">{c.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* similar */}
          {similar.length > 0 && (
            <div className="mt-10">
              <h3 className="mb-4 font-display text-2xl tracking-[0.08em] text-zinc-200">MORE LIKE THIS</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {similar.map((s) => (
                  <button key={s.id} onClick={() => onOpen(s)} className="group text-left">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg ring-1 ring-white/10 transition-all group-hover:ring-inferno/60">
                      <PosterImage
                        path={s.poster_path}
                        alt={itemTitle(s)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <span className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-bold text-amber-400 opacity-0 transition-opacity group-hover:opacity-100">
                        <Star size={9} fill="currentColor" /> {s.vote_average.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-[11px] font-bold text-zinc-300 transition-colors group-hover:text-white">
                      {itemTitle(s)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="mt-10 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-700">
            Data courtesy of TMDB
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-abyss-2 px-5 py-4">
      <p className="text-[9px] font-extrabold uppercase tracking-[0.26em] text-zinc-600">{label}</p>
      <p className="mt-1.5 text-sm font-extrabold text-zinc-100">{value}</p>
    </div>
  );
}
