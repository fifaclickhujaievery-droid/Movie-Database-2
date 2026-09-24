import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Airplay,
  AudioLines,
  Box,
  Cast,
  Check,
  ClipboardCheck,
  Cloud,
  Cone,
  Copy,
  Download,
  ExternalLink,
  FastForward,
  FileUp,
  FolderOpen,
  Gauge,
  Link2,
  Loader2,
  Maximize,
  MonitorPlay,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Subtitles,
  TriangleAlert,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { cn } from '../utils/cn';

interface Props {
  onClose: () => void;
  initialUrl?: string | null;
}

/* Legal samples: Creative Commons / public streaming test vectors */
const SAMPLES = [
  { name: 'Big Buck Bunny', kind: 'MP4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
  { name: 'Sintel', kind: 'MP4', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4' },
  { name: 'BipBop · multi-audio + subs', kind: 'HLS', url: 'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8' },
  { name: 'HLS Test Stream', kind: 'HLS', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
  { name: 'BBB · DASH', kind: 'DASH', url: 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd' },
];

/* ------------------------------------------------------------------ */
/*  Format intelligence — detect how a link can be played              */
/* ------------------------------------------------------------------ */

type StreamKind = 'hls' | 'dash' | 'native' | 'external';
const EXT_NATIVE = new Set(['mp4', 'm4v', 'webm', 'ogv', 'ogg', 'mov', '3gp']);
const EXT_EXTERNAL = new Set(['mkv', 'avi', 'wmv', 'flv', 'ts', 'm2ts', 'mpg', 'mpeg', 'vob', 'divx', 'rmvb']);

function detectKind(url: string): { kind: StreamKind; ext: string | null } {
  const clean = url.split(/[?#]/)[0];
  const ext = (clean.split('.').pop() || '').toLowerCase();
  if (/\.m3u8($|\?|#)/i.test(url)) return { kind: 'hls', ext };
  if (ext === 'mpd') return { kind: 'dash', ext };
  if (EXT_NATIVE.has(ext)) return { kind: 'native', ext };
  if (EXT_EXTERNAL.has(ext)) return { kind: 'external', ext };
  return { kind: 'native', ext: ext || null };
}

const KIND_LABEL: Record<StreamKind, string> = {
  hls: 'HLS adaptive',
  dash: 'DASH adaptive',
  native: 'Direct file',
  external: 'External only',
};

/* ------------------------------------------------------------------ */
/*  Lazy CDN engines (hls.js + dash.js) — fetched only when needed     */
/* ------------------------------------------------------------------ */

interface HlsLike {
  loadSource(url: string): void;
  attachMedia(el: HTMLVideoElement): void;
  on(evt: string, cb: (e: unknown, data: Record<string, unknown>) => void): void;
  destroy(): void;
  audioTracks: { name: string; lang?: string }[];
  audioTrack: number;
  subtitleTracks: { name: string; lang?: string }[];
  subtitleTrack: number;
  subtitleDisplay: boolean;
  levels: { height?: number; bitrate: number }[];
  currentLevel: number;
}
type HlsCtor = {
  isSupported(): boolean;
  Events: Record<string, string>;
  new (cfg: Record<string, unknown>): HlsLike;
};
let hlsPromise: Promise<HlsCtor | null> | null = null;
function loadHls(): Promise<HlsCtor | null> {
  const w = window as unknown as { Hls?: HlsCtor };
  if (w.Hls) return Promise.resolve(w.Hls);
  hlsPromise ??= new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js';
    s.onload = () => resolve((window as unknown as { Hls?: HlsCtor }).Hls ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return hlsPromise;
}

interface DashPlayerLike {
  initialize(el: HTMLVideoElement, url: string, autoplay: boolean): void;
  reset(): void;
}
interface DashFactory {
  MediaPlayer(): { create(): DashPlayerLike };
}
let dashPromise: Promise<DashFactory | null> | null = null;
function loadDash(): Promise<DashFactory | null> {
  const w = window as unknown as { dashjs?: DashFactory };
  if (w.dashjs) return Promise.resolve(w.dashjs);
  dashPromise ??= new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.dashjs.org/latest/dash.all.min.js';
    s.onload = () => resolve((window as unknown as { dashjs?: DashFactory }).dashjs ?? null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return dashPromise;
}

/* ------------------------------------------------------------------ */

const fmt = (s: number) => {
  if (!isFinite(s)) return s === Infinity ? 'LIVE' : '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`;
};

const srtToVtt = (text: string) =>
  'WEBVTT\n\n' +
  text
    .replace(/﻿/g, '')
    .replace(/\r/g, '')
    .replace(/(\d{1,2}:\d{2}:\d{2})[,.](\d{3})/g, '$1.$2');

interface ExtSub {
  id: string;
  label: string;
  track: TextTrack;
}

export default function CloudPlayer({ onClose, initialUrl }: Props) {
  /* stream state */
  const [urlInput, setUrlInput] = useState('');
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [externalOnly, setExternalOnly] = useState(false);
  const [streamInfo, setStreamInfo] = useState<{ kind: StreamKind; ext: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  /* advanced */
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [barMenu, setBarMenu] = useState<'none' | 'sub' | 'audio'>('none');
  const [panelTab, setPanelTab] = useState<'playback' | 'send'>('playback');
  const [audioTracks, setAudioTracks] = useState<{ id: number; label: string }[]>([]);
  const [audioSel, setAudioSel] = useState(0);
  const [hlsSubs, setHlsSubs] = useState<{ id: number; label: string }[]>([]);
  const [subChoice, setSubChoice] = useState<string>('off');
  const [extSubs, setExtSubs] = useState<ExtSub[]>([]);
  const [subUrl, setSubUrl] = useState('');
  const [subLoading, setSubLoading] = useState(false);
  const [subMsg, setSubMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [levels, setLevels] = useState<{ id: number; label: string }[]>([]);
  const [levelSel, setLevelSel] = useState(-1);
  const [handoff, setHandoff] = useState<{ text: string; pkg: string | null; name: string } | null>(null);
  const [nativeAudio, setNativeAudio] = useState(false);
  const [copied, setCopied] = useState<'url' | 'share' | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsLike | null>(null);
  const dashRef = useRef<DashPlayerLike | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blobUrls = useRef<string[]>([]);

  const isLive = !isFinite(duration) && duration !== 0;
  const togglePlayRef = useRef<() => void>(() => undefined);

  /* scroll lock + keyboard */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlayRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    const blobs = blobUrls.current;
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      hlsRef.current?.destroy();
      dashRef.current?.reset();
      blobs.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [onClose]);

  /* ------------------- submit / attach ------------------- */

  const submit = useCallback(
    (raw?: string) => {
      const u = (raw ?? urlInput).trim();
      if (!u) return;
      if (!/^https?:\/\//i.test(u)) {
        setActiveUrl(u);
        setStreamInfo({ kind: 'external', ext: null });
        setExternalOnly(true);
        setError(null);
        return;
      }
      const det = detectKind(u);
      setError(null);
      setActiveUrl(u);
      setStreamInfo(det);
      setExternalOnly(det.kind === 'external');
      setCurrent(0);
      setDuration(0);
      setDims(null);
      setAudioTracks([]);
      setAudioSel(0);
      setNativeAudio(false);
      setHlsSubs([]);
      setSubChoice('off');
      setLevels([]);
      setLevelSel(-1);
      setExtSubs([]);
      setPanelTab('playback');
      blobUrls.current.forEach((x) => URL.revokeObjectURL(x));
      blobUrls.current = [];
      try {
        history.replaceState(null, '', `#play=${encodeURIComponent(u)}`);
      } catch {
        /* ignore */
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [urlInput],
  );

  const booted = useRef(false);
  useEffect(() => {
    if (initialUrl && !booted.current) {
      booted.current = true;
      setUrlInput(initialUrl);
      submit(initialUrl);
    }
  }, [initialUrl, submit]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeUrl || externalOnly) return;

    let cancelled = false;
    setError(null);
    setBuffering(true);
    const kind = streamInfo?.kind ?? detectKind(activeUrl).kind;

    const attach = async () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      dashRef.current?.reset();
      dashRef.current = null;

      if (kind === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeUrl; // Safari native HLS
      } else if (kind === 'hls') {
        const Hls = await loadHls();
        if (!cancelled && Hls?.isSupported()) {
          const hls = new Hls({ enableWorker: true });
          hlsRef.current = hls;
          hls.loadSource(activeUrl);
          hls.attachMedia(video);
          const readManifest = () => {
            if (cancelled) return;
            const aud = hls.audioTracks.map((t, i) => ({
              id: i,
              label: t.name || t.lang?.toUpperCase() || `Audio ${i + 1}`,
            }));
            setAudioTracks((prev) => (aud.length > 1 ? aud : prev.length ? prev : []));
            setAudioSel(Math.max(0, hls.audioTrack));
            const subs = hls.subtitleTracks.map((t, i) => ({
              id: i,
              label: t.name || t.lang?.toUpperCase() || `Subtitle ${i + 1}`,
            }));
            setHlsSubs(subs);
            const lv = hls.levels
              .map((l, i) => ({
                id: i,
                label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)} kbps`,
              }))
              .sort((a, b) => parseInt(b.label) - parseInt(a.label));
            setLevels(lv.length > 1 ? lv : []);
          };
          hls.on(Hls.Events.MANIFEST_PARSED, readManifest);
          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, readManifest);
          hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, readManifest);
          hls.on(Hls.Events.LEVEL_SWITCHED, () => {
            if (hls.currentLevel !== -1) setLevelSel(hls.currentLevel);
          });
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) setError('This HLS stream could not be loaded. It may be offline or blocked by CORS.');
          });
          return;
        }
        video.src = activeUrl;
      } else if (kind === 'dash') {
        const dashjs = await loadDash();
        if (!cancelled && dashjs) {
          const p = dashjs.MediaPlayer().create();
          dashRef.current = p;
          p.initialize(video, activeUrl, true);
          return;
        }
        video.src = activeUrl;
      } else {
        video.src = activeUrl;
      }
      video.play().catch(() => undefined);
    };

    void attach();
    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      dashRef.current?.reset();
      dashRef.current = null;
    };
  }, [activeUrl, externalOnly, streamInfo]);

  /* auto-hide controls */
  const pokeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 2800);
  }, []);

  useEffect(() => {
    pokeControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pokeControls, activeUrl]);

  /* ------------------- transport ------------------- */

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || !activeUrl || externalOnly) return;
    if (v.paused) void v.play();
    else v.pause();
  }, [activeUrl, externalOnly]);
  togglePlayRef.current = togglePlay;

  const seek = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setCurrent(t);
  };

  const toggleFullscreen = () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  };

  /* ------------------- external handoff ------------------- */

  const copyText = async (text: string, which: 'url' | 'share') => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(which);
    setTimeout(() => setCopied(null), 1600);
  };

  const shareLink = () =>
    `${location.origin}${location.pathname}#play=${encodeURIComponent(activeUrl ?? '')}`;

  const castAvailable = () => {
    const v = videoRef.current as (HTMLVideoElement & { remote?: { prompt(): Promise<void> } }) | null;
    return !!v?.remote;
  };
  const airplayAvailable = () => {
    const v = videoRef.current as (HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void }) | null;
    return typeof v?.webkitShowPlaybackTargetPicker === 'function';
  };
  const isAndroid = /android/i.test(navigator.userAgent);

  const buildIntent = (url: string, pkg: string) => {
    const m = url.match(/^(https?):\/\/(.+)$/i);
    if (!m) return null;
    return (
      `intent://${m[2]}#Intent;scheme=${m[1].toLowerCase()};package=${pkg};` +
      `action=android.intent.action.VIEW;type=video/*;S.title=FlikuH1x%20Stream;end`
    );
  };

  const openAndroidApp = (pkg: string, name: string) => {
    if (!activeUrl) return;
    const uri = buildIntent(activeUrl, pkg);
    if (!uri) {
      setHandoff({ text: 'Only http(s) links can be handed to Android apps.', pkg: null, name });
      return;
    }
    let left = false;
    const mark = () => {
      left = true;
    };
    document.addEventListener('visibilitychange', mark);
    window.addEventListener('blur', mark);
    window.addEventListener('pagehide', mark);
    const cleanup = () => {
      document.removeEventListener('visibilitychange', mark);
      window.removeEventListener('blur', mark);
      window.removeEventListener('pagehide', mark);
    };
    setHandoff(null);
    window.location.href = uri;
    setTimeout(() => {
      cleanup();
      if (left || document.hidden) return; // app took over
      setHandoff({ text: `${name} didn't open — is it installed?`, pkg, name });
    }, 2200);
  };

  const openVlcAndroid = () => openAndroidApp('org.videolan.vlc', 'VLC');

  /* ------------------- tracks & subtitles ------------------- */

  const chooseAudio = (id: number) => {
    setAudioSel(id);
    if (hlsRef.current) {
      hlsRef.current.audioTrack = id;
      return;
    }
    const nat = (videoRef.current as (HTMLVideoElement & {
      audioTracks?: { length: number; [i: number]: { enabled: boolean } };
    }) | null)?.audioTracks;
    if (nat) {
      for (let i = 0; i < nat.length; i++) nat[i].enabled = i === id;
    }
  };

  const chooseSub = (choice: string) => {
    setSubChoice(choice);
    const hls = hlsRef.current;
    extSubs.forEach((s) => {
      s.track.mode = 'hidden';
    });
    if (choice === 'off') {
      if (hls) {
        hls.subtitleTrack = -1;
        hls.subtitleDisplay = false;
      }
      return;
    }
    if (choice.startsWith('h:') && hls) {
      hls.subtitleDisplay = true;
      hls.subtitleTrack = Number(choice.slice(2));
      return;
    }
    if (choice.startsWith('x:')) {
      if (hls) {
        hls.subtitleTrack = -1;
        hls.subtitleDisplay = false;
      }
      const t = extSubs.find((s) => s.id === choice.slice(2));
      if (t) t.track.mode = 'showing';
    }
  };

  const subOptions = [
    { value: 'off', label: 'Subtitles Off' },
    ...hlsSubs.map((s) => ({ value: `h:${s.id}`, label: s.label })),
    ...extSubs.map((s) => ({ value: `x:${s.id}`, label: s.label })),
  ];
  const pickSub = (v: string) => {
    chooseSub(v);
    setBarMenu('none');
  };
  const pickAudio = (id: number) => {
    chooseAudio(id);
    setBarMenu('none');
  };

  const ingestSubtitle = (text: string, label: string) => {
    const video = videoRef.current;
    if (!video) return;
    const vtt = /^\s*WEBVTT/i.test(text) ? text : srtToVtt(text);
    const blobUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
    blobUrls.current.push(blobUrl);
    const el = document.createElement('track');
    el.kind = 'subtitles';
    el.label = label;
    el.srclang = 'und';
    el.src = blobUrl;
    video.appendChild(el);
    const id = `x-${Date.now()}`;
    extSubs.forEach((s) => {
      s.track.mode = 'hidden';
    });
    el.track.mode = 'showing';
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = -1;
      hlsRef.current.subtitleDisplay = false;
    }
    setExtSubs((prev) => [...prev, { id, label, track: el.track }]);
    setSubChoice(`x:${id}`);
    setSubMsg({ ok: true, text: `“${label}” loaded` });
  };

  const loadSubFromUrl = async () => {
    const u = subUrl.trim();
    if (!/^https?:\/\//i.test(u)) {
      setSubMsg({ ok: false, text: 'Subtitle link must start with http(s)://' });
      return;
    }
    setSubLoading(true);
    setSubMsg(null);
    try {
      const res = await fetch(u);
      if (!res.ok) throw new Error();
      const text = await res.text();
      const fname = decodeURIComponent(u.split('/').pop() || 'Subtitle').replace(/\.(srt|vtt)$/i, '');
      ingestSubtitle(text, fname || 'External subtitles');
    } catch {
      setSubMsg({ ok: false, text: 'Could not fetch subtitles (offline or CORS-blocked)' });
    } finally {
      setSubLoading(false);
    }
  };

  const loadSubFromFile = async (f: File) => {
    setSubLoading(true);
    setSubMsg(null);
    try {
      const text = await f.text();
      ingestSubtitle(text, f.name.replace(/\.(srt|vtt)$/i, ''));
    } catch {
      setSubMsg({ ok: false, text: 'Could not read that file' });
    } finally {
      setSubLoading(false);
    }
  };

  const progress = isFinite(duration) && duration > 0 ? (current / duration) * 100 : 0;
  const hasExtras = audioTracks.length > 1 || hlsSubs.length > 0 || levels.length > 0;

  /* ================================================================ */

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md md:p-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 32, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        className="flex max-h-full w-full max-w-3xl flex-col overflow-y-auto rounded-2xl border border-white/8 bg-[#0b0b0e] shadow-[0_40px_120px_-24px_rgba(0,0,0,0.95)]"
      >
        {/* ---- chrome bar ---- */}
        <div className="flex items-center gap-2.5 px-5 pt-4">
          <Cloud size={15} className="text-inferno" strokeWidth={2.2} />
          <span className="font-display text-base tracking-[0.16em] text-white">CLOUD STREAM</span>
          <span className="ml-1 h-3.5 w-px bg-white/10" />
          <span className="hidden text-[11px] font-medium text-zinc-500 sm:block">
            Direct-link playback engine
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {isAndroid && activeUrl && (
              <button
                onClick={openVlcAndroid}
                aria-label="Open in VLC for Android"
                className="flex items-center gap-1.5 rounded-full border border-[#FF7B00]/35 bg-[#FF7B00]/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#ffab5e] transition-colors hover:bg-[#FF7B00]/20"
              >
                <Cone size={11} /> VLC
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close player"
              className="grid size-8 place-items-center rounded-full text-zinc-500 transition-all hover:rotate-90 hover:bg-white/5 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {!activeUrl ? (
          /* =============== EMPTY STATE — input is the hero =============== */
          <div className="flex flex-col items-center px-6 pb-8 pt-10 text-center md:pt-14">
            <div className="grid size-14 place-items-center rounded-2xl bg-inferno/10 ring-1 ring-inferno/25">
              <Cloud size={24} className="text-inferno" strokeWidth={1.8} />
            </div>
            <h3 className="mt-5 font-display text-4xl tracking-[0.06em] text-white md:text-5xl">
              PASTE A LINK.<br />PRESS PLAY.
            </h3>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-zinc-500">
              Any direct video URL — MP4, WebM, MOV, HLS or DASH — plays right here with subtitle,
              audio-track and quality control. Nothing is uploaded or hosted.
            </p>

            {/* hero input */}
            <div className="mt-7 w-full max-w-xl">
              <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] p-1.5 pl-4 transition-colors focus-within:border-inferno/60">
                <Link2 size={15} className="shrink-0 text-zinc-500" />
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="https://… (mp4 · webm · m3u8 · mpd)"
                  spellCheck={false}
                  autoFocus
                  className="w-full bg-transparent py-2 text-[13px] text-white placeholder:text-zinc-600 focus:outline-none"
                />
                <button
                  onClick={() => submit()}
                  className="flex shrink-0 items-center gap-2 rounded-lg bg-inferno px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.16em] text-white transition-all hover:bg-inferno-soft active:scale-95"
                >
                  <Play size={12} fill="currentColor" /> Stream
                </button>
              </div>

              {/* samples */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
                <span className="mr-1.5 text-[9px] font-extrabold uppercase tracking-[0.22em] text-zinc-700">
                  Try
                </span>
                {SAMPLES.map((s) => (
                  <button
                    key={s.url}
                    onClick={() => {
                      setUrlInput(s.url);
                      submit(s.url);
                    }}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {s.name}
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-wider text-zinc-700">
                      {s.kind}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-9 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
              <ShieldCheck size={11} />
              Only stream content you have the rights to watch
            </p>
          </div>
        ) : (
          /* =============== LOADED — slim input + player =============== */
          <div className="px-5 pb-4 pt-3">
            <div className="mb-3 flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1 pl-3 transition-colors focus-within:border-white/25">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                spellCheck={false}
                aria-label="Stream URL"
                className="w-full bg-transparent py-1.5 text-[12px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
              />
              <button
                onClick={() => submit()}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/8 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white transition-colors hover:bg-inferno"
              >
                <Play size={10} fill="currentColor" /> Load
              </button>
            </div>

            {/* ---- player shell ---- */}
            <div
              ref={shellRef}
              onMouseMove={pokeControls}
              onClick={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'VIDEO') {
                  setSettingsOpen(false);
                  setBarMenu('none');
                  togglePlay();
                }
              }}
              className={cn(
                'relative aspect-video w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10',
                !externalOnly ? 'cursor-pointer' : 'grid place-items-center',
                !controlsVisible && playing && 'cursor-none',
              )}
            >
              {externalOnly ? (
                /* ---- container not browser-decodable ---- */
                <div className="max-w-sm px-6 text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-400/10 ring-1 ring-amber-400/25">
                    <TriangleAlert size={20} className="text-amber-400" strokeWidth={1.8} />
                  </div>
                  <p className="mt-4 font-display text-2xl tracking-[0.08em] text-white">
                    {streamInfo?.ext ? `${streamInfo.ext.toUpperCase()} NEEDS AN EXTERNAL PLAYER` : 'EXTERNAL PLAYER REQUIRED'}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    Browsers can't decode this container (its codecs aren't web-licensed). Its audio and
                    subtitle tracks travel with the file — switch them inside VLC once it opens.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <HandoffButtons
                      activeUrl={activeUrl}
                      onCopy={() => copyText(activeUrl, 'url')}
                      copied={copied === 'url'}
                      onVlcAndroid={openVlcAndroid}
                    />
                  </div>
                  {handoff && <HandoffToast handoff={handoff} onDismiss={() => setHandoff(null)} />}
                  <button
                    onClick={() => setActiveUrl(null)}
                    className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white"
                  >
                    ← Load a different link
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full"
                    playsInline
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      setDuration(v.duration);
                      setDims({ w: v.videoWidth, h: v.videoHeight });
                      const nat = (v as HTMLVideoElement & {
                        audioTracks?: { length: number; [i: number]: { label?: string; language?: string; enabled: boolean } };
                      }).audioTracks;
                      if (nat && nat.length > 1 && !hlsRef.current) {
                        setAudioTracks(
                          Array.from({ length: nat.length }, (_, i) => ({
                            id: i,
                            label: nat[i].label || nat[i].language?.toUpperCase() || `Audio ${i + 1}`,
                          })),
                        );
                        setNativeAudio(true);
                      }
                      const tt = v.textTracks;
                      if (tt && tt.length) {
                        for (let i = 0; i < tt.length; i++) tt[i].mode = 'hidden';
                      }
                    }}
                    onWaiting={() => setBuffering(true)}
                    onPlaying={() => setBuffering(false)}
                    onCanPlay={() => setBuffering(false)}
                    onError={() =>
                      setError('Playback failed — the link may be offline, blocked by CORS, or in a codec browsers can\u2019t decode.')
                    }
                  />

                  {buffering && !error && (
                    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20">
                      <Loader2 size={34} className="animate-spin text-white/80" />
                    </div>
                  )}

                  {/* top-left status chips */}
                  <div className="pointer-events-none absolute left-3 top-3 z-10 flex gap-1.5">
                    {isLive && (
                      <span className="flex items-center gap-1.5 rounded-md bg-inferno px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">
                        <span className="size-1.5 animate-pulse rounded-full bg-white" /> Live
                      </span>
                    )}
                    {streamInfo && (
                      <span className="rounded-md bg-black/60 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-zinc-300 backdrop-blur">
                        {streamInfo.ext ? streamInfo.ext.toUpperCase() : 'AUTO'} · {KIND_LABEL[streamInfo.kind]}
                        {dims ? ` · ${dims.h}p` : ''}
                      </span>
                    )}
                  </div>

                  {error && (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-black/75 p-6">
                      <div className="max-w-sm text-center">
                        <TriangleAlert size={26} className="mx-auto text-inferno" />
                        <p className="mt-3 text-sm font-bold text-white">Browser can't play this one</p>
                        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{error}</p>
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                          <HandoffButtons
                            activeUrl={activeUrl}
                            onCopy={() => copyText(activeUrl, 'url')}
                            copied={copied === 'url'}
                            onVlcAndroid={openVlcAndroid}
                            compact
                          />
                        </div>
                        {handoff && <HandoffToast handoff={handoff} onDismiss={() => setHandoff(null)} />}
                        <button
                          onClick={() => setActiveUrl(null)}
                          className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-white"
                        >
                          ← Load a different link
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ---- settings panel ---- */}
                  {settingsOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.18 }}
                      onClick={(e) => e.stopPropagation()}
                      className="scrollbar-hide absolute bottom-[4.7rem] right-3 z-20 max-h-[76%] w-[300px] max-w-[calc(100%-24px)] overflow-y-auto rounded-xl border border-white/10 bg-abyss/95 p-3 shadow-2xl backdrop-blur-xl"
                    >
                      {/* tabs */}
                      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-black/45 p-1">
                        {(
                          [
                            { key: 'playback', label: 'Playback' },
                            { key: 'send', label: 'Send To' },
                          ] as const
                        ).map((t) => (
                          <button
                            key={t.key}
                            onClick={() => setPanelTab(t.key)}
                            className={cn(
                              'rounded-md py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] transition-all',
                              panelTab === t.key ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300',
                            )}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {panelTab === 'playback' && (
                        <>
                          {/* audio */}
                          <PanelLabel icon={<AudioLines size={11} className="text-inferno" />} text="Audio track" />
                          {audioTracks.length > 1 ? (
                            <ChipRow
                              options={audioTracks.map((t) => ({ value: String(t.id), label: t.label }))}
                              active={String(audioSel)}
                              onPick={(v) => chooseAudio(Number(v))}
                            />
                          ) : (
                            <Note>
                              Single track · multi-audio needs HLS/DASH.
                              {nativeAudio ? ' Tracks inside MKV/MP4 files are not readable by browsers.' : ''}
                            </Note>
                          )}

                          {/* quality */}
                          <PanelLabel icon={<Gauge size={11} className="text-inferno" />} text="Quality" className="mt-3" />
                          {levels.length ? (
                            <ChipRow
                              options={[{ value: '-1', label: 'Auto' }, ...levels.map((l) => ({ value: String(l.id), label: l.label }))]}
                              active={String(levelSel)}
                              onPick={(v) => {
                                const id = Number(v);
                                setLevelSel(id);
                                if (hlsRef.current) hlsRef.current.currentLevel = id;
                              }}
                            />
                          ) : (
                            <Note>Source quality · adaptation is automatic.</Note>
                          )}

                          {/* subtitles */}
                          <PanelLabel icon={<Subtitles size={11} className="text-inferno" />} text="Subtitles" className="mt-3" />
                          <ChipRow
                            options={[
                              { value: 'off', label: 'Off' },
                              ...hlsSubs.map((s) => ({ value: `h:${s.id}`, label: s.label })),
                              ...extSubs.map((s) => ({ value: `x:${s.id}`, label: s.label })),
                            ]}
                            active={subChoice}
                            onPick={chooseSub}
                          />

                          {/* load subs */}
                          <div className="mt-2 flex items-center gap-1.5">
                            <input
                              value={subUrl}
                              onChange={(e) => setSubUrl(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && loadSubFromUrl()}
                              placeholder=".srt / .vtt URL…"
                              spellCheck={false}
                              className="w-full rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-[11px] text-white placeholder:text-zinc-600 transition-colors focus:border-inferno/50 focus:outline-none"
                            />
                            <button
                              onClick={loadSubFromUrl}
                              disabled={subLoading}
                              aria-label="Load subtitle URL"
                              className="grid size-8 shrink-0 place-items-center rounded-lg bg-inferno text-white transition-all hover:bg-inferno-soft disabled:opacity-50"
                            >
                              {subLoading ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
                            </button>
                            <button
                              onClick={() => fileRef.current?.click()}
                              aria-label="Upload subtitle file"
                              className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/15 text-zinc-300 transition-all hover:border-inferno/60 hover:text-white"
                            >
                              <FolderOpen size={12} />
                            </button>
                          </div>
                          <input
                            ref={fileRef}
                            type="file"
                            accept=".srt,.vtt,text/vtt"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void loadSubFromFile(f);
                              e.target.value = '';
                            }}
                          />
                          {subMsg && (
                            <p className={cn('mt-1.5 text-[10px] font-semibold', subMsg.ok ? 'text-emerald-400' : 'text-inferno')}>
                              {subMsg.text}
                            </p>
                          )}
                        </>
                      )}

                      {panelTab === 'send' && (
                        <>
                          <div className="grid grid-cols-3 gap-1.5">
                            <ExtBtn icon={<Cone size={13} />} label="VLC" onClick={() => activeUrl && (window.location.href = `vlc://${activeUrl}`)} />
                            <ExtBtn icon={<Box size={13} />} label="PotPlayer" onClick={() => activeUrl && (window.location.href = `potplayer://${activeUrl}`)} />
                            <ExtBtn icon={<Smartphone size={13} />} label="MX Player" onClick={() => openAndroidApp('com.mxtech.videoplayer.ad', 'MX Player')} />
                            <ExtBtn icon={<MonitorPlay size={13} />} label="IINA" onClick={() => activeUrl && (window.location.href = `iina://weblink?url=${encodeURIComponent(activeUrl)}`)} />
                            <ExtBtn icon={<Airplay size={13} />} label="Infuse" onClick={() => activeUrl && (window.location.href = `infuse://x-callback-url/play?url=${encodeURIComponent(activeUrl)}`)} />
                            <ExtBtn icon={<Play size={13} />} label="nPlayer" onClick={() => activeUrl && (window.location.href = `nplayer-${activeUrl}`)} />
                          </div>
                          <button
                            onClick={openVlcAndroid}
                            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#FF7B00]/12 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-[#ffab5e] ring-1 ring-[#FF7B00]/35 transition-all hover:bg-[#FF7B00]/22"
                          >
                            <Cone size={12} /> Launch VLC on Android
                          </button>
                          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                            <MiniAction
                              icon={copied === 'url' ? <ClipboardCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
                              label={copied === 'url' ? 'Copied' : 'Copy URL'}
                              onClick={() => activeUrl && copyText(activeUrl, 'url')}
                            />
                            <MiniAction
                              icon={copied === 'share' ? <ClipboardCheck size={11} className="text-emerald-400" /> : <Link2 size={11} />}
                              label={copied === 'share' ? 'Copied' : 'Share'}
                              onClick={() => activeUrl && copyText(shareLink(), 'share')}
                            />
                            <a
                              href={activeUrl ?? '#'}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[9.5px] font-extrabold uppercase tracking-wider text-zinc-400 transition-all hover:border-inferno/50 hover:text-white"
                            >
                              <Download size={11} /> Save
                            </a>
                          </div>
                          {handoff && <div className="mt-2"><HandoffToast handoff={handoff} onDismiss={() => setHandoff(null)} /></div>}
                          <Note className="mt-2.5">
                            Desktop VLC: copy the URL → Media → Open Network Stream → paste.
                          </Note>
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* ---- controls ---- */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onMouseMove={pokeControls}
                    className={cn(
                      'absolute inset-x-0 bottom-0 z-10 cursor-default bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-12 transition-opacity duration-300',
                      controlsVisible || !playing || settingsOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                    )}
                  >
                    <input
                      type="range"
                      min={0}
                      max={isFinite(duration) ? duration : 0}
                      step={0.1}
                      value={current}
                      onChange={(e) => seek(Number(e.target.value))}
                      disabled={isLive}
                      aria-label="Seek"
                      className="player-range w-full disabled:opacity-40"
                      style={{ ['--fill' as string]: `${progress}%` }}
                    />

                    <div className="mt-1 flex items-center gap-1.5">
                      <button
                        onClick={togglePlay}
                        aria-label={playing ? 'Pause' : 'Play'}
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95"
                      >
                        {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
                      </button>
                      {!isLive && (
                        <>
                          <IconBtn label="Back 10 seconds" onClick={() => seek(Math.max(0, current - 10))}>
                            <RotateCcw size={14} />
                          </IconBtn>
                          <IconBtn label="Forward 10 seconds" onClick={() => seek(Math.min(duration, current + 10))}>
                            <FastForward size={14} />
                          </IconBtn>
                        </>
                      )}

                      <span className="ml-1.5 select-none text-[11px] font-semibold tabular-nums text-zinc-300">
                        {fmt(current)} <span className="text-zinc-600">/ {isLive ? 'LIVE' : fmt(duration)}</span>
                      </span>

                      <div className="ml-auto flex items-center gap-1">
                        <div className="group/vol hidden items-center sm:flex">
                          <IconBtn
                            label={muted ? 'Unmute' : 'Mute'}
                            onClick={() => {
                              const v = videoRef.current;
                              if (!v) return;
                              v.muted = !v.muted;
                              setMuted(v.muted);
                            }}
                          >
                            {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </IconBtn>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={muted ? 0 : volume}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const v = videoRef.current;
                              if (!v) return;
                              v.volume = val;
                              v.muted = val === 0;
                              setVolume(val);
                              setMuted(val === 0);
                            }}
                            aria-label="Volume"
                            className="player-range w-0 opacity-0 transition-all duration-300 group-hover/vol:w-16 group-hover/vol:opacity-100"
                            style={{ ['--fill' as string]: `${(muted ? 0 : volume) * 100}%` }}
                          />
                        </div>

                        {/* CC */}
                        <div className="relative">
                          <IconBtn
                            label="Subtitles"
                            active={barMenu === 'sub'}
                            onClick={() => {
                              setBarMenu((m) => (m === 'sub' ? 'none' : 'sub'));
                              setSettingsOpen(false);
                            }}
                          >
                            <Subtitles size={14} className={subChoice !== 'off' ? 'text-inferno' : undefined} />
                          </IconBtn>
                          {barMenu === 'sub' && (
                            <BarMenu
                              title="Subtitles"
                              options={subOptions}
                              active={subChoice}
                              onPick={pickSub}
                              footer={
                                <button
                                  onClick={() => {
                                    setBarMenu('none');
                                    setSettingsOpen(true);
                                    setPanelTab('playback');
                                    setTimeout(() => fileRef.current?.click(), 80);
                                  }}
                                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10.5px] font-bold text-zinc-400 transition-colors hover:bg-white/8 hover:text-white"
                                >
                                  <FolderOpen size={11} className="text-inferno" /> Load .srt / .vtt…
                                </button>
                              }
                            />
                          )}
                        </div>

                        {/* Audio */}
                        {audioTracks.length > 0 && (
                          <div className="relative">
                            <IconBtn
                              label="Audio track"
                              active={barMenu === 'audio'}
                              onClick={() => {
                                setBarMenu((m) => (m === 'audio' ? 'none' : 'audio'));
                                setSettingsOpen(false);
                              }}
                            >
                              <AudioLines size={14} className={audioSel > 0 ? 'text-inferno' : undefined} />
                            </IconBtn>
                            {barMenu === 'audio' && (
                              <BarMenu
                                title="Audio track"
                                options={audioTracks.map((t) => ({ value: String(t.id), label: t.label }))}
                                active={String(audioSel)}
                                onPick={(v) => pickAudio(Number(v))}
                              />
                            )}
                          </div>
                        )}

                        {castAvailable() && (
                          <IconBtn
                            label="Cast to device"
                            onClick={() => {
                              const v = videoRef.current as HTMLVideoElement & { remote?: { prompt(): Promise<void> } };
                              void v?.remote?.prompt().catch(() => undefined);
                            }}
                          >
                            <Cast size={14} />
                          </IconBtn>
                        )}
                        {airplayAvailable() && (
                          <IconBtn
                            label="AirPlay"
                            onClick={() => {
                              const v = videoRef.current as HTMLVideoElement & { webkitShowPlaybackTargetPicker?: () => void };
                              v?.webkitShowPlaybackTargetPicker?.();
                            }}
                          >
                            <Airplay size={14} />
                          </IconBtn>
                        )}

                        {/* speed */}
                        <div className="hidden items-center gap-1 rounded-full border border-white/15 px-2 py-1 md:flex">
                          <Gauge size={11} className="text-zinc-500" />
                          <select
                            value={speed}
                            onChange={(e) => {
                              const s = Number(e.target.value);
                              setSpeed(s);
                              if (videoRef.current) videoRef.current.playbackRate = s;
                            }}
                            aria-label="Playback speed"
                            className="cursor-pointer bg-transparent text-[11px] font-bold text-zinc-300 focus:outline-none"
                          >
                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                              <option key={s} value={s} className="bg-abyss">
                                {s}×
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="relative">
                          <IconBtn
                            label="Stream settings"
                            active={settingsOpen}
                            onClick={() => {
                              setSettingsOpen((v) => !v);
                              setBarMenu('none');
                            }}
                          >
                            <SlidersHorizontal size={14} />
                          </IconBtn>
                          {hasExtras && subChoice === 'off' && (
                            <span className="pointer-events-none absolute right-1.5 top-1.5 size-1.5 rounded-full bg-inferno" />
                          )}
                        </div>

                        <IconBtn label="Fullscreen" onClick={toggleFullscreen}>
                          <Maximize size={14} />
                        </IconBtn>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-[9.5px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
              <ShieldCheck size={10} />
              FlikuH1x hosts no video files — only stream content you have the rights to watch
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ================= primitives ================= */

function IconBtn({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full transition-colors',
        active ? 'bg-white/15 text-white' : 'text-zinc-300 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

function PanelLabel({ icon, text, className }: { icon: React.ReactNode; text: string; className?: string }) {
  return (
    <p className={cn('mb-1.5 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.22em] text-zinc-500', className)}>
      {icon} {text}
    </p>
  );
}

function ChipRow({
  options,
  active,
  onPick,
}: {
  options: { value: string; label: string }[];
  active: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onPick(o.value)}
          className={cn(
            'rounded-full border px-3 py-1.5 text-[10px] font-bold transition-all',
            active === o.value
              ? 'border-inferno bg-inferno text-white'
              : 'border-white/10 text-zinc-400 hover:border-white/30 hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Note({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-2 text-[10.5px] font-semibold leading-relaxed text-zinc-500', className)}>
      {children}
    </p>
  );
}

function HandoffToast({
  handoff,
  onDismiss,
}: {
  handoff: { text: string; pkg: string | null; name: string };
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-4 flex max-w-sm flex-wrap items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3"
    >
      <p className="text-[11px] font-bold text-amber-300">{handoff.text}</p>
      {handoff.pkg && (
        <a
          href={`https://play.google.com/store/apps/details?id=${handoff.pkg}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-amber-400 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
        >
          Install {handoff.name}
        </a>
      )}
      <button
        onClick={onDismiss}
        className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-300 transition-colors hover:text-white"
      >
        Dismiss
      </button>
    </motion.div>
  );
}

function BarMenu({
  title,
  options,
  active,
  onPick,
  footer,
}: {
  title: string;
  options: { value: string; label: string }[];
  active: string;
  onPick: (v: string) => void;
  footer?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16 }}
      className="scrollbar-hide absolute bottom-full right-0 z-30 mb-2 max-h-52 w-48 overflow-y-auto rounded-xl border border-white/10 bg-abyss/95 p-2 shadow-2xl backdrop-blur-xl"
    >
      <p className="px-1.5 pb-1.5 text-[8.5px] font-extrabold uppercase tracking-[0.22em] text-zinc-500">
        {title}
      </p>
      <div className="flex flex-col gap-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onPick(o.value)}
            className={cn(
              'flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[11px] font-bold transition-all',
              active === o.value ? 'bg-inferno text-white' : 'text-zinc-300 hover:bg-white/8 hover:text-white',
            )}
          >
            <span className="truncate">{o.label}</span>
            {active === o.value && <Check size={11} className="shrink-0" />}
          </button>
        ))}
      </div>
      {footer && <div className="mt-1 border-t border-white/8 pt-1">{footer}</div>}
    </motion.div>
  );
}

function ExtBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 transition-all hover:border-inferno/50 hover:text-white"
    >
      <span className="text-inferno">{icon}</span>
      {label}
    </button>
  );
}

function MiniAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-[9.5px] font-extrabold uppercase tracking-wider text-zinc-400 transition-all hover:border-inferno/50 hover:text-white"
    >
      {icon} {label}
    </button>
  );
}

/* Quick handoff row used in unplayable states */
function HandoffButtons({
  activeUrl,
  onCopy,
  copied,
  compact,
  onVlcAndroid,
}: {
  activeUrl: string;
  onCopy: () => void;
  copied: boolean;
  compact?: boolean;
  onVlcAndroid?: () => void;
}) {
  const btn = cn(
    'flex items-center gap-2 rounded-full font-extrabold uppercase tracking-[0.14em] transition-all active:scale-95',
    compact ? 'px-4 py-2 text-[10px]' : 'px-5 py-2.5 text-[11px]',
  );
  return (
    <>
      {onVlcAndroid ? (
        <button onClick={onVlcAndroid} className={cn(btn, 'bg-[#FF7B00]/90 text-white hover:bg-[#FF7B00]')}>
          <Cone size={13} /> VLC app
        </button>
      ) : (
        <a href={`vlc://${activeUrl}`} className={cn(btn, 'bg-inferno text-white hover:bg-inferno-soft')}>
          <Cone size={13} /> VLC
        </a>
      )}
      <a href={`potplayer://${activeUrl}`} className={cn(btn, 'border border-white/15 text-white hover:border-inferno/60')}>
        <Box size={13} /> PotPlayer
      </a>
      <button onClick={onCopy} className={cn(btn, 'border border-white/15 text-white hover:border-inferno/60')}>
        {copied ? <ClipboardCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
        {copied ? 'Copied' : 'Copy URL'}
      </button>
      <a
        href={activeUrl}
        target="_blank"
        rel="noreferrer"
        className={cn(btn, 'border border-white/15 text-white hover:border-inferno/60')}
      >
        <ExternalLink size={13} /> Open raw
      </a>
    </>
  );
}
