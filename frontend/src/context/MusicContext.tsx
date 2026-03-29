import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MusicSource = 'local' | 'youtube';

export interface Track {
  _id?: string;
  id: string; // Internal ID or videoId
  title: string;
  url: string; // For local: path; For YT: videoId
  type: MusicSource;
  author?: string;
  thumbnail?: string;
}

interface MusicContextType {
  currentTrack: Track;
  isPlaying: boolean;
  volume: number;
  isLooping: boolean;
  isMuted: boolean;
  playlist: Track[];
  play: () => void;
  pause: () => void;
  stop: () => void;
  setTrack: (track: Track) => void;
  setVolume: (v: number) => void;
  toggleLoop: () => void;
  toggleMute: () => void;
  fetchMetadata: (videoId: string) => Promise<Partial<Track>>;
  addToPlaylist: (track: Track) => Promise<void>;
  removeFromPlaylist: (id: string) => Promise<void>;
  loadPlaylist: () => Promise<void>;
}

const DEFAULT_TRACKS: Track[] = [
  { id: 'lofi',  title: 'Lofi Chill',  url: '/music/lofi.mp3',  type: 'local', author: 'TimeVault' },
  { id: 'rain',  title: 'Rain Ambient', url: '/music/rain.mp3',  type: 'local', author: 'Nature' },
  { id: 'focus', title: 'Deep Focus',  url: '/music/focus.mp3', type: 'local', author: 'Brain' },
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
  const [playlist,  setPlaylist]  = useState<Track[]>([]);

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

  useEffect(() => { if (audioRef.current) audioRef.current.loop = isLooping; }, [isLooping]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
    if (ytPlayerRef.current?.setVolume) ytPlayerRef.current.setVolume(isMuted ? 0 : volume * 100);
  }, [volume, isMuted]);

  // ── YouTube API Setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (ytApiLoadedRef.current) return;
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    ytApiLoadedRef.current = true;
  }, []);

  const loadYTVideo = useCallback((videoId: string) => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.loadVideoById(videoId);
      if (!isPlaying) ytPlayerRef.current.pauseVideo();
    }
  }, [isPlaying]);

  // ── Metadata Fetcher ──────────────────────────────────────────────────────
  const fetchMetadata = useCallback(async (videoId: string): Promise<Partial<Track>> => {
    try {
      const resp = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
      const data = await resp.json();
      return {
        title: data.title || 'YouTube Music',
        author: data.author_name || 'YouTube',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      };
    } catch {
      return { 
        title: 'YouTube Music', 
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` 
      };
    }
  }, []);

  // ── Playlist Actions ──────────────────────────────────────────────────────
  const loadPlaylist = useCallback(async () => {
    try {
      const { data } = await api.get<Track[]>('/playlist');
      setPlaylist(data);
    } catch { /* Silent */ }
  }, []);

  useEffect(() => { loadPlaylist(); }, [loadPlaylist]);

  const addToPlaylist = async (track: Track) => {
    try {
      const { data } = await api.post<Track>('/playlist', {
        videoId: track.url,
        title: track.title,
        author: track.author,
        thumbnail: track.thumbnail,
        type: track.type
      });
      setPlaylist(prev => [data, ...prev]);
      toast.success('Added to Study Playlist');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add');
    }
  };

  const removeFromPlaylist = async (id: string) => {
    try {
      await api.delete(`/playlist/${id}`);
      setPlaylist(prev => prev.filter(t => t._id !== id));
      toast.success('Removed from Playlist');
    } catch {
      toast.error('Failed to remove');
    }
  };

  // ── Core Actions ───────────────────────────────────────────────────────────
  const play = useCallback(() => {
    setIsPlaying(true);
    if (currentTrack.type === 'local' && audioRef.current) {
      if (audioRef.current.src !== window.location.origin + currentTrack.url) {
        audioRef.current.src = currentTrack.url;
      }
      audioRef.current.play().catch(() => setIsPlaying(false));
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
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    if (ytPlayerRef.current) { ytPlayerRef.current.stopVideo(); }
  }, []);

  const setTrack = (t: Track) => {
    const wasPlaying = isPlaying;
    setCurrentTrack(t);
    localStorage.setItem(LS_KEY_MUSIC_TRACK, JSON.stringify(t));
    if (t.type === 'local') {
      if (ytPlayerRef.current) ytPlayerRef.current.stopVideo();
      if (audioRef.current) {
        audioRef.current.src = t.url;
        if (wasPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
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
    window.addEventListener('storage', (e) => { if (e.key === LS_KEY_TIMER_ACTIVE) syncWithTimer(); });
    return () => window.removeEventListener('storage', syncWithTimer);
  }, [play, pause]);

  // Global refs for component use
  (window as any)._tv_ytPlayerRef = ytPlayerRef;
  (window as any)._tv_onPlayerReady = (event: any) => {
    event.target.setVolume(volume * 100);
    if (isPlaying) event.target.playVideo();
    else event.target.pauseVideo();
  };

  return (
    <MusicContext.Provider value={{
      currentTrack, isPlaying, volume, isLooping, isMuted, playlist,
      play, pause, stop, setTrack, setVolume, toggleLoop, toggleMute,
      fetchMetadata, addToPlaylist, removeFromPlaylist, loadPlaylist
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
};
