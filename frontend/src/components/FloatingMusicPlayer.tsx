import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Music, Youtube, ExternalLink } from 'lucide-react';
import { useMusic } from '../context/MusicContext';

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_KEY_MUSIC_EXPANDED = 'tv_music_expanded';

// ─────────────────────────────────────────────────────────────────────────────

export default function FloatingMusicPlayer() {
  const { 
    currentTrack, isPlaying, volume, isMuted,
    play, pause, setVolume, toggleMute 
  } = useMusic();

  const [expanded, setExpanded] = useState(() => localStorage.getItem(LS_KEY_MUSIC_EXPANDED) === 'true');
  const ytContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY_MUSIC_EXPANDED, String(expanded));
  }, [expanded]);

  // Handle YouTube Player Initialization
  useEffect(() => {
    if (currentTrack.type === 'youtube' && !((window as any)._tv_ytPlayerRef.current)) {
      const initPlayer = () => {
        if ((window as any).YT && (window as any).YT.Player) {
          (window as any)._tv_ytPlayerRef.current = new (window as any).YT.Player('yt-player-hidden', {
            height: '0',
            width: '0',
            videoId: currentTrack.url,
            playerVars: {
              autoplay: isPlaying ? 1 : 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              rel: 0,
            },
            events: {
              onReady: (window as any)._tv_onPlayerReady,
            },
          });
        } else {
          setTimeout(initPlayer, 200);
        }
      };
      initPlayer();
    }
  }, [currentTrack, isPlaying]);

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed bottom-6 left-6 z-[8000] select-none"
    >
      {/* Hidden YouTube Iframe Container */}
      <div id="yt-player-hidden" className="hidden" ref={ytContainerRef}></div>

      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative overflow-hidden rounded-xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.8)]"
        style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)' }}
      >
        {isPlaying && (
          <div className="absolute inset-0 rounded-xl border border-cyan-500/30 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)] pointer-events-none" />
        )}

        {/* Collapsed view / Header */}
        <div 
          className="flex items-center gap-3 px-4 py-3 cursor-pointer group"
          onClick={() => setExpanded(!expanded)}
        >
          <div className={`p-1.5 rounded-md transition-colors ${isPlaying ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
            {currentTrack.type === 'youtube' ? (
              <Youtube size={14} className={isPlaying ? 'text-cyan-400' : 'text-gray-500'} />
            ) : (
              <Music size={14} className={isPlaying ? 'text-cyan-400' : 'text-gray-500'} />
            )}
          </div>
          
          <div className="flex flex-col min-w-[100px] max-w-[140px]">
            <span className={`text-[11px] font-mono font-bold truncate tracking-wider ${isPlaying ? 'text-cyan-400' : 'text-gray-400'}`}>
              {currentTrack.title}
            </span>
            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest leading-none">
              Focus Audio
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-3">
                {[0.4, 0.7, 0.3, 1].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: isPlaying ? [`${h*100}%`, '100%', `${h*100}%`] : '10%' }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1 }}
                    className="w-0.5 bg-cyan-500/60 rounded-full"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expanded Panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/5"
            >
              <div className="px-4 py-4 space-y-4 w-64">
                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={isPlaying ? pause : play}
                    className={`w-12 h-12 flex items-center justify-center rounded-full transition-all ${
                      isPlaying 
                        ? 'bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                        : 'bg-white/5 border border-white/20 text-gray-400 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                  </motion.button>
                </div>

                {/* Volume Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors" onClick={toggleMute}>
                      {isMuted || volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      <span>Volume</span>
                    </div>
                    <span>{Math.round(volume * 100)}%</span>
                  </div>
                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden group/vol cursor-pointer">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div 
                      className="absolute top-0 left-0 h-full bg-cyan-500 transition-all"
                      style={{ width: `${volume * 100}%` }}
                    />
                  </div>
                </div>

                {/* Source Info */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[9px] font-mono text-gray-700 uppercase tracking-widest">
                    Source: {currentTrack.type}
                  </span>
                  {currentTrack.type === 'youtube' && (
                    <a 
                      href={`https://youtube.com/watch?v=${currentTrack.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-700 hover:text-white transition-colors"
                    >
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
