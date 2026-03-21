import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MusicSource = 'local' | 'youtube';

export interface Track {
  id: string;
  title: string;
  url: string; // For local: path; For YT: videoId
  type: MusicSource;
}

interface MusicContextType {
  currentTrack: Track;
  isPlaying: boolean;
  volume: number;
  isLooping: boolean;
  isMuted: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setTrack: (track: Track) => void;
  setVolume: (v: number) => void;
  toggleLoop: () => void;
  toggleMute: () => void;
}

const DEFAULT_TRACKS: Track[] = [
  { id: 'lofi',  title: 'Lofi Chill',  url: '/music/lofi.mp3',  type: 'local' },
  { id: 'rain',  title: 'Rain Ambient', url: '/music/rain.mp3',  type: 'local' },
  { id: 'focus', title: 'Deep Focus',  url: '/music/focus.mp3', type: 'local' },
];

const LS_KEY_MUSIC_TRACK  = 'tv_music_track';
const LS_KEY_MUSIC_VOL    = 'tv_music_volume';
const LS_KEY_TIMER_ACTIVE = 'tv_timer_active';

const MusicContext = createContext<MusicContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [currentTrack, setCurrentTrack] = useState<Track>(() => {
    const saved = localStorage.getItem(LS_KEY_MUSIC_TRACK);
    return saved ? JSON.parse(saved) : DEFAULT_TRACKS[0];
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume,    setVolumeState] = useState(() => Number(localStorage.getItem(LS_KEY_MUSIC_VOL) ?? 0.5));
  const [isLooping, setIsLooping] = useState(true);
  const [isMuted,   setIsMuted]   = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytApiLoadedRef = useRef(false);

  // ── Local Audio Setup ──────────────────────────────────────────────────────
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.loop = isLooping;
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
    }
  }, [volume, isMuted]);

  // ── YouTube API Setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (ytApiLoadedRef.current) return;
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    ytApiLoadedRef.current = true;

    (window as any).onYouTubeIframeAPIReady = () => {
      // API Loaded
    };
  }, []);

  const loadYTVideo = useCallback((videoId: string) => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.loadVideoById(videoId);
      if (!isPlaying) ytPlayerRef.current.pauseVideo();
    } else {
      // Will be initialized by the player component
    }
  }, [isPlaying]);

  // ── Core Actions ───────────────────────────────────────────────────────────
  const play = useCallback(() => {
    setIsPlaying(true);
    if (currentTrack.type === 'local' && audioRef.current) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.play().catch(console.error);
    } else if (currentTrack.type === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.playVideo();
    }
  }, [currentTrack]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (currentTrack.type === 'local' && audioRef.current) {
      audioRef.current.pause();
    } else if (currentTrack.type === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.pauseVideo();
    }
  }, [currentTrack]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (ytPlayerRef.current) {
      ytPlayerRef.current.stopVideo();
    }
  }, []);

  const setTrack = (t: Track) => {
    const wasPlaying = isPlaying;
    setCurrentTrack(t);
    localStorage.setItem(LS_KEY_MUSIC_TRACK, JSON.stringify(t));
    
    if (t.type === 'local') {
      if (ytPlayerRef.current) ytPlayerRef.current.stopVideo();
      if (audioRef.current) {
        audioRef.current.src = t.url;
        if (wasPlaying) audioRef.current.play().catch(console.error);
      }
    } else {
      if (audioRef.current) audioRef.current.pause();
      loadYTVideo(t.url);
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    localStorage.setItem(LS_KEY_MUSIC_VOL, String(v));
  };

  const toggleLoop = () => setIsLooping(!isLooping);
  const toggleMute = () => setIsMuted(!isMuted);

  // ── Timer Sync Logic ───────────────────────────────────────────────────────
  useEffect(() => {
    const syncWithTimer = () => {
      const active = localStorage.getItem(LS_KEY_TIMER_ACTIVE) === 'true';
      if (active) play();
      else pause();
    };

    // Listen for storage events (changes from other tabs/controls)
    window.addEventListener('storage', (e) => {
      if (e.key === LS_KEY_TIMER_ACTIVE) syncWithTimer();
    });

    // Check on mount (if timer already active)
    if (localStorage.getItem(LS_KEY_TIMER_ACTIVE) === 'true') {
      // Don't auto-play on first load to comply with browser policies
      // unless user interacts. But we will set isPlaying if we can.
    }

    return () => window.removeEventListener('storage', syncWithTimer);
  }, [play, pause]);

  // ── Component for YT Iframe ───────────────────────────────────────────────
  // We'll expose the ytPlayerRef through the context so a component can render the <div>
  (window as any)._tv_ytPlayerRef = ytPlayerRef;
  (window as any)._tv_onPlayerReady = (event: any) => {
    event.target.setVolume(volume * 100);
    if (isPlaying) event.target.playVideo();
  };

  return (
    <MusicContext.Provider value={{
      currentTrack, isPlaying, volume, isLooping, isMuted,
      play, pause, stop, setTrack, setVolume, toggleLoop, toggleMute
    }}>
      {children}
      {/* Hidden container for YT player if needed, but better to render in a component */}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
};
