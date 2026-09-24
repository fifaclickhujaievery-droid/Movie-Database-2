import { AtSign, Clapperboard, Globe, Rss, Send } from 'lucide-react';

const COLS: { head: string; links: { label: string; href: string }[] }[] = [
  {
    head: 'Browse',
    links: [
      { label: 'Trending Now', href: '#top10' },
      { label: 'Popular Movies', href: '#movies' },
      { label: 'Top Series', href: '#series' },
      { label: 'Anime Vault', href: '#anime' },
    ],
  },
  {
    head: 'Genres',
    links: [
      { label: 'Action', href: '#browse' },
      { label: 'Sci-Fi', href: '#browse' },
      { label: 'Drama', href: '#browse' },
      { label: 'Horror', href: '#browse' },
    ],
  },
  {
    head: 'Company',
    links: [
      { label: 'About', href: '#top' },
      { label: 'Careers', href: '#top' },
      { label: 'Press', href: '#top' },
      { label: 'Contact', href: '#top' },
    ],
  },
  {
    head: 'Legal',
    links: [
      { label: 'Terms of Use', href: '#top' },
      { label: 'Privacy', href: '#top' },
      { label: 'Cookies', href: '#top' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-white/5">
      {/* ghost word */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[-4rem] select-none text-center font-display text-[22vw] leading-none tracking-[0.08em] text-stroke-faint md:bottom-[-8rem]">
        FLIKUH1X
      </div>

      <div className="relative mx-auto max-w-[1500px] px-5 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <a href="#top" className="flex w-fit items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-inferno text-white">
                <Clapperboard size={18} strokeWidth={2.4} />
              </span>
              <span className="font-display text-3xl leading-none tracking-[0.14em] text-white">
                FLIKU<span className="text-inferno">H1X</span>
              </span>
            </a>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-zinc-500">
              A handcrafted cinematic database. Track what's trending, explore the greatest films and
              series ever made, and curate your own watchlist.
            </p>
            <div className="mt-6 flex gap-2.5">
              {[AtSign, Rss, Send, Globe].map((Icon, i) => (
                <a
                  key={i}
                  href="#top"
                  aria-label="Social link"
                  className="grid size-10 place-items-center rounded-full border border-white/10 text-zinc-400 transition-all hover:-translate-y-1 hover:border-inferno hover:text-inferno"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.head}>
              <h4 className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-zinc-300">
                {col.head}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-zinc-500 transition-colors hover:text-inferno">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-7 md:flex-row">
          <p className="text-[11px] font-semibold tracking-wide text-zinc-600">
            © {new Date().getFullYear()} FlikuH1x. All rights reserved.
          </p>
          <p className="max-w-md text-center text-[11px] leading-relaxed text-zinc-600 md:text-right">
            This product uses the TMDB API but is not endorsed or certified by{' '}
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 transition-colors hover:text-inferno"
            >
              TMDB
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
