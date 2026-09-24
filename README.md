# FlikuH1x

A cinematic movie & TV database web app powered by the **TMDB API**.

## Features

- **Live TMDB data** — trending, popular, top-rated movies & series, discovered in real time
- **Auto-rotating hero billboard** with Ken Burns backdrops and progress indicators
- **Top 10 trending row** with giant ghost numerals
- **Genre explorer** — filter the full catalogue by type & genre with infinite "load more"
- **Rich detail view** — synopsis, TMDB rating, runtime/seasons, budget & revenue, top cast,
  YouTube trailer playback, and "more like this" recommendations
- **Where to Watch** — official streaming/rent/buy deep-links per region (JustWatch data via TMDB),
  with a region switcher for 11 countries
- **The Anime Vault** — dedicated zone for top-rated Japanese anime series & films
  (Crunchyroll/Netflix availability via Watch Providers)
- **Cloud Stream** — paste any direct video URL and play it instantly: MP4/M4V/WebM/OGV/MOV/3GP
  direct files, **HLS** `.m3u8` (hls.js), **DASH** `.mpd` (dash.js) — all engines lazy-loaded from
  CDN, keeping the core bundle ~150 KB gz. Codec-smart: containers browsers can't decode
  (MKV/AVI/TS/WMV/FLV…) get a polished one-tap handoff card instead of a dead error.
  VLC-class controls: seek, ±10s, volume, speed, fullscreen, live-stream detection —
  plus **dedicated quick CC & audio buttons right in the control bar** with instant popover
  menus (HLS renditions or any external `.srt`/`.vtt` by URL or local file, auto-converted to
  WebVTT), **HLS quality selection**, **stream info readout**, **Chromecast & AirPlay** when
  supported, and **external app handoff** — including **VLC for Android** via intent deep-link
  with automatic Play Store fallback (plus PotPlayer, MX Player, IINA, Infuse, nPlayer, and an
  Android detection pill in the player header). Streams are shareable via `#play=<url>` deep
  links. The app hosts and indexes no video files.
- **Instant search** (press `/`) with debounced multi-search across movies & series
- **My List** — bookmark titles; persisted to `localStorage`
- Cinematic dark UI — film-grain overlay, ghost display type, marquee, smooth Framer Motion physics
- Offline-resilient — graceful fallback catalogue if the network is unreachable

## Stack

React 19 · Vite 7 · Tailwind CSS 4 · Framer Motion · Lucide · TMDB API v3

## Run

```bash
npm install
npm run dev
```

This product uses the TMDB API but is not endorsed or certified by TMDB.
