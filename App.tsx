import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookmarkCheck, Film } from 'lucide-react';
import type { TmdbItem } from './lib/types';
import { mediaOf } from './lib/types';
import { fallbackPage, tmdb } from './lib/tmdb';
import type { Paged } from './lib/types';
import { useMyList, usePaged } from './lib/hooks';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MovieRow from './components/MovieRow';
import GenreExplorer from './components/GenreExplorer';
import DetailModal from './components/DetailModal';
import type { SelectedRef } from './components/DetailModal';
import SearchOverlay from './components/SearchOverlay';
import CloudPlayer from './components/CloudPlayer';
import Footer from './components/Footer';

export default function App() {
  /* ---------------- data feeds ---------------- */
  const trending = usePaged<TmdbItem>(
    (p) => tmdb<Paged<TmdbItem>>('/trending/all/week', { page: p }),
    [],
    fallbackPage('trending').results,
  );
  const popularMovies = usePaged<TmdbItem>(
    (p) =>
      tmdb<Paged<TmdbItem>>('/movie/popular', { page: p }).then((r) => ({
        ...r,
        results: r.results.map((x) => ({ ...x, media_type: 'movie' })),
      })),
    [],
    fallbackPage('movies').results,
  );
  const topTv = usePaged<TmdbItem>(
    (p) =>
      tmdb<Paged<TmdbItem>>('/tv/top_rated', { page: p }).then((r) => ({
        ...r,
        results: r.results.map((x) => ({ ...x, media_type: 'tv' })),
      })),
    [],
    fallbackPage('tv').results,
  );
  const topMovies = usePaged<TmdbItem>(
    (p) =>
      tmdb<Paged<TmdbItem>>('/movie/top_rated', { page: p }).then((r) => ({
        ...r,
        results: r.results.map((x) => ({ ...x, media_type: 'movie' })),
      })),
    [],
    fallbackPage('movies').results,
  );
  /* anime = Animation (genre 16) + Japanese origin */
  const animeTv = usePaged<TmdbItem>(
    (p) =>
      tmdb<Paged<TmdbItem>>('/discover/tv', {
        page: p,
        with_genres: 16,
        with_origin_country: 'JP',
        sort_by: 'vote_average.desc',
        'vote_count.gte': 80,
      }).then((r) => ({ ...r, results: r.results.map((x) => ({ ...x, media_type: 'tv' })) })),
    [],
    fallbackPage('tv').results.filter((x) => x.genre_ids?.includes(16)),
  );
  const animeFilms = usePaged<TmdbItem>(
    (p) =>
      tmdb<Paged<TmdbItem>>('/discover/movie', {
        page: p,
        with_genres: 16,
        with_origin_country: 'JP',
        sort_by: 'vote_average.desc',
        'vote_count.gte': 80,
      }).then((r) => ({ ...r, results: r.results.map((x) => ({ ...x, media_type: 'movie' })) })),
    [],
    fallbackPage('trending').results.filter((x) => x.genre_ids?.includes(16)),
  );

  /* ---------------- overlays ---------------- */
  const [selected, setSelected] = useState<(SelectedRef & { autoplay?: boolean }) | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudInit, setCloudInit] = useState<string | null>(null);
  const myList = useMyList();

  const openSearch = useCallback(() => {
    setCloudOpen(false);
    setSearchOpen(true);
  }, []);

  const openCloud = useCallback(() => {
    setSearchOpen(false);
    setCloudOpen(true);
  }, []);

  const closeCloud = useCallback(() => {
    setCloudOpen(false);
    setCloudInit(null);
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch {
      /* ignore */
    }
  }, []);

  /* deep link: open  site/#play=<encoded stream url>  → boots straight into the player */
  useEffect(() => {
    const m = location.hash.match(/^#play=(.+)$/);
    if (m) {
      try {
        setCloudInit(decodeURIComponent(m[1]));
        setCloudOpen(true);
      } catch {
        /* malformed hash — ignore */
      }
    }
  }, []);

  const openDetails = useCallback((item: TmdbItem) => {
    setSelected({ id: item.id, type: mediaOf(item), seed: item, autoplay: false });
    setSearchOpen(false);
  }, []);

  const openTrailer = useCallback((item: TmdbItem) => {
    setSelected({ id: item.id, type: mediaOf(item), seed: item, autoplay: true });
  }, []);

  /* "/" focuses search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || selected || searchOpen) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, searchOpen]);

  const heroItems = trending.items.filter((t) => t.backdrop_path);

  return (
    <div className="noise min-h-screen bg-abyss font-body text-zinc-100">
      <Navbar onSearch={openSearch} onCloud={openCloud} savedCount={myList.list.length} />

      <main>
        <Hero
          items={heroItems}
          loading={trending.loading}
          onDetails={openDetails}
          onTrailer={openTrailer}
        />

        <MovieRow
          id="movies"
          kicker="Everyone's watching"
          title="POPULAR MOVIES"
          items={popularMovies.items}
          loading={popularMovies.loading}
          onOpen={openDetails}
          onToggleList={myList.toggle}
          isInList={myList.has}
        />

        <MovieRow
          id="top10"
          kicker="This week on FlikuH1x"
          title="TOP 10 TRENDING"
          items={trending.items}
          loading={trending.loading}
          onOpen={openDetails}
          onToggleList={myList.toggle}
          isInList={myList.has}
          ranked
        />

        <GenreExplorer onOpen={openDetails} onToggleList={myList.toggle} isInList={myList.has} />

        <MovieRow
          id="series"
          kicker="Binge-worthy"
          title="ACCLAIMED SERIES"
          items={topTv.items}
          loading={topTv.loading}
          onOpen={openDetails}
          onToggleList={myList.toggle}
          isInList={myList.has}
        />

        {/* -------- ANIME ZONE -------- */}
        <div id="anime" className="relative my-8 overflow-hidden border-y border-white/5 bg-abyss-2/50 py-8">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-1 top-1/2 hidden -translate-y-1/2 select-none text-[13rem] font-extrabold leading-none text-stroke-faint [writing-mode:vertical-rl] lg:block"
          >
            アニメ
          </span>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex max-w-[1500px] flex-wrap items-end justify-between gap-4 px-5 md:px-10"
          >
            <div>
              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.3em] text-inferno">
                Straight from Japan
              </p>
              <h2 className="font-display text-4xl tracking-[0.06em] text-white md:text-5xl">
                THE ANIME VAULT
              </h2>
            </div>
            <p className="max-w-sm pb-1 text-[13px] leading-relaxed text-zinc-500">
              The highest-rated Japanese animation on the planet — from legendary long-runners to
              Studio Ghibli masterpieces. Availability links included on every title.
            </p>
          </motion.div>

          <MovieRow
            kicker="Highest rated"
            title="ANIME SERIES"
            items={animeTv.items}
            loading={animeTv.loading}
            onOpen={openDetails}
            onToggleList={myList.toggle}
            isInList={myList.has}
          />
          <MovieRow
            kicker="Modern classics & Ghibli"
            title="ANIME FILMS"
            items={animeFilms.items}
            loading={animeFilms.loading}
            onOpen={openDetails}
            onToggleList={myList.toggle}
            isInList={myList.has}
          />
        </div>

        <Marquee
          words={['Anime', 'Action', 'Drama', 'Sci-Fi', 'Thriller', 'Comedy', 'Horror', 'Mystery']}
        />

        <MovieRow
          kicker="Timeless classics"
          title="CRITICALLY ACCLAIMED"
          items={topMovies.items}
          loading={topMovies.loading}
          onOpen={openDetails}
          onToggleList={myList.toggle}
          isInList={myList.has}
        />

        {myList.list.length > 0 && (
          <MovieRow
            id="mylist"
            kicker="Your personal vault"
            title="MY LIST"
            items={myList.list}
            onOpen={openDetails}
            onToggleList={myList.toggle}
            isInList={myList.has}
          />
        )}

        {myList.list.length === 0 && <EmptyListHint />}
      </main>

      <Footer />

      <AnimatePresence>
        {searchOpen && (
          <SearchOverlay
            key="search"
            trending={trending.items}
            onOpen={openDetails}
            onClose={() => setSearchOpen(false)}
            onToggleList={myList.toggle}
            isInList={myList.has}
          />
        )}
        {cloudOpen && <CloudPlayer key="cloud" initialUrl={cloudInit} onClose={closeCloud} />}
        {selected && (
          <DetailModal
            key={`${selected.type}-${selected.id}`}
            selected={selected}
            onClose={() => setSelected(null)}
            onOpen={openDetails}
            onToggleList={myList.toggle}
            inList={myList.has(selected.id)}
            autoplay={selected.autoplay}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---- decorative genre marquee ---- */
function Marquee({ words }: { words: string[] }) {
  const doubled = [...words, ...words, ...words];
  return (
    <div className="relative overflow-hidden border-y border-white/5 py-6">
      <div
        className="flex w-max items-center gap-10 whitespace-nowrap"
        style={{ animation: 'marquee 30s linear infinite' }}
      >
        {doubled.map((w, i) => (
          <span key={i} className="flex items-center gap-10">
            <span className="font-display text-5xl tracking-[0.1em] text-stroke md:text-6xl">{w}</span>
            <Film size={22} className="text-inferno/70" />
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }`}</style>
    </div>
  );
}

/* ---- hint shown until the user saves something ---- */
function EmptyListHint() {
  return (
    <section id="mylist" className="py-14">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-xl flex-col items-center px-6 text-center"
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-inferno/12 text-inferno ring-1 ring-inferno/30">
          <BookmarkCheck size={24} />
        </span>
        <h3 className="mt-5 font-display text-3xl tracking-[0.08em] text-white">BUILD YOUR VAULT</h3>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">
          Tap the bookmark on any poster to pin it to your personal list. Your vault lives right here,
          saved on this device.
        </p>
      </motion.div>
    </section>
  );
}
