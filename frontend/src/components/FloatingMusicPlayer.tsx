import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Music, Youtube, ListMusic } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

export default function FloatingMusicPlayer() {
  const { 
    currentTrack, isPlaying, volume, isMuted,
    play, pause, setVolume, toggleMute 
  } = useMusic();

  const [expanded, setExpanded] = useState(false);
  const ytContainerRef = useRef<HTMLDivElement>(null);

  // ── Render YouTube Iframe ──────────────────────────────────────────────────
  useEffect(() => {
    if (currentTrack.type !== 'youtube') return;
    
    const interval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        clearInterval(interval);
        new (window as any).YT.Player(ytContainerRef.current, {
          height: '0',
          width: '0',
          videoId: currentTrack.url,
          playerVars: {
            autoplay: isPlaying ? 1 : 0,
            controls: 0,
            showinfo: 0,
            modestbranding: 1,
            loop: 1,
            fs: 0,
            cc_load_policy: 0,
            iv_load_policy: 3,
            autohide: 1,
          },
          events: {
            onReady: (window as any)._tv_onPlayerReady,
          },
        });
        (window as any)._tv_ytPlayerRef.current = (window as any)._tv_ytPlayerRef.current || {}; 
        // Note: Actual reference is handled in the global window callback in MusicContext
      }
    }, 500);

    return () => clearInterval(interval);
  }, [currentTrack.url]);

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col items-start gap-3">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-64 glass-card bg-black/80 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-4"
          >
            {/* Metadata Section */}
            <div className="flex items-center gap-3">
              {currentTrack.thumbnail ? (
                <img src={currentTrack.thumbnail} className="w-16 h-12 rounded-lg object-cover" alt="" />
              ) : (
                <div className="w-16 h-12 rounded-lg bg-red-600/10 flex items-center justify-center">
                  <Music className="text-red-500" size={18} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-[11px] font-mono font-bold text-white truncate">{currentTrack.title}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                  {currentTrack.type === 'youtube' ? <Youtube size={10} className="text-red-600" /> : <Music size={10} className="text-gray-500" />}
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest truncate">{currentTrack.author || 'Internal'}</span>
                </div>
              </div>
            </div>

            {/* Progress / Volume Mini Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[8px] font-mono text-gray-700 uppercase tracking-widest">
                <span>Mix Volume</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-gray-600 hover:text-white transition-colors">
                  {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
                <div className="flex-1 h-1 bg-white/5 rounded-full relative cursor-pointer group">
                  <input
                    type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full" style={{ width: `${volume * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Quick Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] font-bold">Sync Active</span>
              <button 
                onClick={isPlaying ? pause : play}
                className="p-2 rounded-lg bg-red-600 text-white shadow-lg shadow-red-900/20 hover:scale-105 transition-all"
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all shadow-xl
          ${expanded ? 'bg-red-600 border-red-500 text-white' : 'bg-black/40 border-white/10 text-gray-400 hover:border-red-600/50 hover:text-white backdrop-blur-md'}
        `}
      >
        <div className="relative">
          {currentTrack.type === 'youtube' ? <Youtube size={16} /> : <Music size={16} />}
          {isPlaying && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
          {expanded ? 'Hide Monitor' : 'Music Feed'}
        </span>
        <ListMusic size={14} className={expanded ? 'rotate-180 transition-transform' : ''} />
      </motion.button>

      {/* Hidden YT Container */}
      <div id="yt-player-container" ref={ytContainerRef} className="hidden" />
    </div>
  );
}
