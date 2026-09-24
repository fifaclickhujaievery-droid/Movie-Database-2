import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, Clapperboard, Cloud, Menu, Search, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  onSearch: () => void;
  onCloud: () => void;
  savedCount: number;
}

const LINKS = [
  { label: 'Movies', href: '#movies' },
  { label: 'Series', href: '#series' },
  { label: 'Anime', href: '#anime' },
  { label: 'Top 10', href: '#top10' },
  { label: 'Discover', href: '#browse' },
];

export default function Navbar({ onSearch, onCloud, savedCount }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-500',
        scrolled
          ? 'bg-abyss/85 backdrop-blur-xl border-b border-white/5 py-3'
          : 'bg-gradient-to-b from-black/70 to-transparent py-5',
      )}
    >
      <div className="mx-auto flex max-w-[1500px] items-center gap-8 px-5 md:px-10">
        {/* Brand */}
        <a href="#top" className="group flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-inferno text-white shadow-[0_0_24px_rgba(255,60,46,0.45)] transition-transform duration-300 group-hover:-rotate-6">
            <Clapperboard size={18} strokeWidth={2.4} />
          </span>
          <span className="font-display text-[28px] leading-none tracking-[0.14em] text-white">
            FLIKU<span className="text-inferno">H1X</span>
          </span>
        </a>

        {/* Desktop links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <a
            href="#mylist"
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400 transition-colors hover:text-white"
          >
            <Bookmark size={12} className="text-inferno" fill="currentColor" />
            My List
            {savedCount > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-inferno px-1.5 py-0.5 text-[10px] text-white">
                {savedCount}
              </span>
            )}
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCloud}
            aria-label="Open Cloud Player"
            className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-300 backdrop-blur transition-all hover:border-inferno/60 hover:text-white"
          >
            <Cloud size={15} className="text-inferno" />
            <span className="hidden md:block">Play Link</span>
          </button>
          <button
            onClick={onSearch}
            className="flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.04] py-2 pl-4 pr-3 text-sm text-zinc-400 backdrop-blur transition-all hover:border-inferno/60 hover:text-white md:w-56"
          >
            <Search size={15} />
            <span className="hidden flex-1 text-left text-[13px] md:block">Search titles…</span>
            <kbd className="hidden rounded border border-white/15 px-1.5 text-[10px] text-zinc-500 md:block">/</kbd>
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-full border border-white/12 text-zinc-300 lg:hidden"
            aria-label="Menu"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden border-b border-white/5 bg-abyss/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col px-6 py-4">
              {[...LINKS, { label: 'My List', href: '#mylist' }].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-white/5 py-3.5 font-display text-2xl tracking-[0.12em] text-zinc-300 transition-colors last:border-0 hover:text-inferno"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
