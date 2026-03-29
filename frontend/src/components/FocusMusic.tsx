import { Music, Headphones, Play, Pause, Youtube, Plus, Volume2, Trash2, Library, PlayCircle, Radio, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic, type Track } from '../context/MusicContext';
import { useState, useEffect } from 'react';

const DEFAULT_TRACKS: Track[] = [
  { id: 'lofi',  title: 'Lofi Chill',  url: '/music/lofi.mp3',  type: 'local', author: 'TimeVault' },
  { id: 'rain',  title: 'Rain Ambient', url: '/music/rain.mp3',  type: 'local', author: 'Nature' },
  { id: 'focus', title: 'Deep Focus',  url: '/music/focus.mp3', type: 'local', author: 'Brain' },
];

export default function FocusMusic() {
  const { 
    currentTrack, isPlaying, volume, playlist,
    play, pause, setTrack, setVolume, 
    fetchMetadata, addToPlaylist, removeFromPlaylist 
  } = useMusic();

  const [ytUrl, setYtUrl] = useState('');
  const [, setLoadingMetadata] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<Partial<Track> | null>(null);
  
  // Simulated Progress state
  const [progress, setProgress] = useState(0);

  // Extract Video ID helper
  const getVid = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUrlChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setYtUrl(val);
    const vid = getVid(val);
    if (vid) {
      setLoadingMetadata(true);
      const meta = await fetchMetadata(vid);
      setPreviewTrack({ ...meta, id: vid, url: vid, type: 'youtube' });
      setLoadingMetadata(false);
    } else {
      setPreviewTrack(null);
    }
  };

  const handleAddPreview = async () => {
    if (previewTrack && previewTrack.id) {
      await addToPlaylist(previewTrack as Track);
      setYtUrl('');
      setPreviewTrack(null);
    }
  };

  // ── Simulated Progress Logic ───────────────────────────────────────────────
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.1));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Reset progress when track changes
  useEffect(() => {
    setProgress(0);
  }, [currentTrack.url]);

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto px-4">
      {/* Premium Header / Search Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white uppercase tracking-[0.2em] flex items-center gap-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Radio className="text-[#E50914] animate-pulse" size={28} /> Focus Studio
          </h2>
          <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">
            Phase 19.4 / Neon
          </span>
        </div>

        <div className="relative group">
          <Youtube className="absolute left-5 top-1/2 -translate-y-1/2 text-[#E50914] transition-transform group-focus-within:scale-110" size={20} />
          <input
            type="text"
            placeholder="Search or paste YouTube music link..."
            value={ytUrl}
            onChange={handleUrlChange}
            className="w-full bg-[#050505]/80 border border-white/5 rounded-3xl pl-14 pr-6 py-5 text-sm font-mono text-white focus:outline-none focus:border-[#E50914]/50 focus:ring-4 focus:ring-[#E50914]/5 transition-all shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
             <kbd className="hidden md:block px-2 py-1 bg-white/5 rounded border border-white/10 text-[8px] font-mono text-gray-500 tracking-tighter uppercase">Enter URL</kbd>
          </div>
        </div>

        <AnimatePresence>
          {previewTrack && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="p-5 rounded-3xl bg-gradient-to-r from-[#E50914]/20 via-[#E50914]/5 to-transparent border border-[#E50914]/30 shadow-[0_10px_30px_rgba(229,9,20,0.15)] backdrop-blur-md flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className="relative">
                  <img src={previewTrack.thumbnail} className="w-24 h-16 rounded-xl object-cover shadow-2xl ring-1 ring-white/10" alt="" />
                  <div className="absolute -top-2 -left-2 bg-[#E50914] text-white p-1 rounded-lg text-[8px] font-bold uppercase">New Track</div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-base font-mono font-black text-white tracking-tight truncate max-w-[200px] md:max-w-md">{previewTrack.title}</span>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                    <span className="text-[#E50914]/60">Channel:</span>
                    <span className="text-white/80">{previewTrack.author}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleAddPreview}
                className="group flex flex-col items-center gap-2"
              >
                <div className="p-4 rounded-2xl bg-[#E50914] text-white group-hover:bg-[#ff1e1e] group-active:scale-95 transition-all shadow-[0_8px_20px_rgba(229,9,20,0.4)]">
                   <Plus size={24} />
                </div>
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Add to playlist</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Main Content: Library & Local */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* User Playlist */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-mono font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-3">
                <Library className="text-[#E50914]" size={16} /> Persistent Library
              </h3>
              <span className="text-[9px] font-mono text-gray-700">{playlist.length} Tracks Syncing</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {playlist.length === 0 ? (
                <div className="p-16 rounded-[2.5rem] border border-dashed border-white/5 bg-white/2 text-center space-y-4">
                  <div className="p-5 rounded-full bg-white/3 w-fit mx-auto">
                    <Headphones size={40} className="text-gray-800" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-gray-400 uppercase tracking-[0.2em] font-bold">Your library is silent</p>
                    <p className="text-[10px] font-mono text-gray-700 tracking-wider">Paste a YouTube link above to start building your focus collection.</p>
                  </div>
                </div>
              ) : (
                playlist.map((track) => (
                  <motion.div
                    key={track._id}
                    layout
                    whileHover={{ x: 5 }}
                    className={`group p-4 rounded-[1.5rem] border transition-all flex items-center justify-between
                      ${currentTrack.url === track.url 
                        ? 'bg-[#E50914]/10 border-[#E50914]/40 shadow-[0_10px_30px_rgba(229,9,20,0.05)]' 
                        : 'bg-[#050505] border-white/5 hover:border-white/10 hover:bg-white/3'}
                    `}
                  >
                    <div className="flex items-center gap-5 cursor-pointer flex-1" onClick={() => setTrack(track)}>
                      <div className="relative shrink-0">
                        <img src={track.thumbnail} className="w-16 h-12 rounded-xl object-cover shadow-2xl border border-white/5" alt="" />
                        {currentTrack.url === track.url && isPlaying && (
                          <div className="absolute inset-0 bg-[#E50914]/30 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
                            <div className="flex items-end gap-[2px] h-4">
                               <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-white rounded-full" />
                               <motion.div animate={{ height: [8, 4, 12] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-white rounded-full" />
                               <motion.div animate={{ height: [12, 6, 8] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-1 bg-white rounded-full" />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-sm font-mono font-black truncate transition-colors
                          ${currentTrack.url === track.url ? 'text-[#E50914]' : 'text-white/80 group-hover:text-white'}
                        `}>
                          {track.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest truncate">{track.author}</span>
                          {currentTrack.url === track.url && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-[#E50914]/20 text-[#E50914] font-black uppercase tracking-tighter">Live</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFromPlaylist(track._id!); }}
                        className="p-2.5 rounded-xl text-gray-700 hover:text-[#E50914] hover:bg-[#E50914]/10 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if (currentTrack.url === track.url) isPlaying ? pause() : play(); else setTrack(track); }}
                        className={`p-3 rounded-2xl transition-all shadow-lg
                          ${currentTrack.url === track.url 
                            ? 'bg-[#E50914] text-white shadow-[#E50914]/20' 
                            : 'bg-white/5 text-white hover:bg-white/10'}
                        `}
                      >
                        {currentTrack.url === track.url && isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          {/* Local / Preset Library */}
          <section className="space-y-6">
            <h3 className="text-[11px] font-mono font-black uppercase tracking-[0.4em] text-gray-500 flex items-center gap-3">
              <Plus className="text-gray-700" size={16} /> Systems Originals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {DEFAULT_TRACKS.map((track) => (
                <div
                  key={track.id}
                  onClick={() => setTrack(track)}
                  className={`p-5 rounded-[2rem] border cursor-pointer transition-all flex flex-col gap-4 text-center group
                    ${currentTrack.url === track.url ? 'bg-[#E50914]/10 border-[#E50914]/30' : 'bg-[#050505] border-white/5 hover:border-white/10 hover:bg-white/2'}
                  `}
                >
                  <div className={`p-4 rounded-3xl mx-auto transition-all group-hover:scale-110 ${currentTrack.url === track.url ? 'bg-[#E50914] text-white' : 'bg-white/5 text-gray-600'}`}>
                    <Music size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className={`text-[11px] font-mono font-black uppercase tracking-wider ${currentTrack.url === track.url ? 'text-[#E50914]' : 'text-gray-400'}`}>
                      {track.title}
                    </p>
                    <p className="text-[8px] font-mono text-gray-700 uppercase tracking-widest group-hover:text-[#E50914]/40 transition-colors">Internal Buffer</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: Now Playing & Professional Controls */}
        <div className="space-y-6">
          <div className="p-8 rounded-[2.5rem] bg-[#050505] border border-white/5 space-y-8 sticky top-6 shadow-2xl relative overflow-hidden group/sidebar">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/sidebar:opacity-20 transition-opacity">
               <Music size={120} className="rotate-12" />
            </div>

            <h3 className="text-[10px] font-mono uppercase tracking-[0.5em] text-gray-600 font-bold text-center">Engine Status</h3>
            
            <div className="space-y-6 text-center relative z-10">
              {currentTrack.thumbnail ? (
                <div className="relative group/cover">
                  <img src={currentTrack.thumbnail} className="w-full aspect-square rounded-3xl object-cover shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/5 transition-transform group-hover/cover:scale-105" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-3xl opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                     <div className="p-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
                        <Maximize2 className="text-white" size={24} />
                     </div>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square rounded-3xl bg-[#0B0C10] flex items-center justify-center border border-dashed border-white/10">
                  <PlayCircle size={64} className="text-gray-800 animate-pulse" />
                </div>
              )}
              
              <div className="space-y-2">
                <h4 className="text-xl font-mono font-black text-white leading-tight px-2">{currentTrack.title}</h4>
                <div className="flex items-center justify-center gap-2">
                   <Youtube size={12} className="text-[#E50914]" />
                   <p className="text-[10px] font-mono text-[#E50914] uppercase tracking-[0.3em] font-black">{currentTrack.author || 'Internal'}</p>
                </div>
              </div>
            </div>

            {/* Simulated Progress Bar */}
            <div className="space-y-3 pt-4 border-t border-white/5 relative z-10">
               <div className="flex items-center justify-between text-[8px] font-mono text-gray-600 uppercase tracking-widest">
                  <span>Playback Position</span>
                  <span className="text-white/40">{Math.floor(progress)}% Optimized</span>
               </div>
               <div className="h-1 bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="absolute top-0 left-0 h-full bg-[#E50914] shadow-[0_0_10px_#E50914]"
                  />
               </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[9px] font-mono text-gray-500 uppercase tracking-[0.2em] font-bold">
                  <span>Output Mix</span>
                  <span className="text-[#E50914]">{Math.round(volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <Volume2 size={18} className="text-gray-600" />
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative cursor-pointer group/vol">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#E50914]/50 to-[#E50914] shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all" style={{ width: `${volume * 100}%` }} />
                    <div className="absolute top-1/2 -translate-y-1/2 h-3 w-1 bg-white rounded-full opacity-0 group-hover/vol:opacity-100 transition-opacity" style={{ left: `calc(${volume * 100}% - 2px)` }} />
                  </div>
                </div>
              </div>

              <button
                onClick={isPlaying ? pause : play}
                className={`w-full py-5 rounded-2xl font-mono font-black uppercase tracking-[0.4em] text-[11px] transition-all relative overflow-hidden group/btn flex items-center justify-center gap-3
                  ${isPlaying 
                    ? 'bg-white/5 text-gray-500 border border-white/5 shadow-none' 
                    : 'bg-[#E50914] text-white shadow-[0_15px_40px_rgba(229,9,20,0.3)] hover:scale-[1.02] hover:bg-[#ff1e1e]'}
                `}
              >
                {isPlaying ? (
                  <>
                    <Pause size={16} fill="currentColor" />
                    <span>Engaged</span>
                  </>
                ) : (
                  <>
                    <Play size={16} fill="currentColor" className="ml-0.5" />
                    <span>Ignite Focus</span>
                  </>
                )}
                {/* Glossy overlay effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
              </button>
            </div>

            <div className="pt-6 text-center">
               <p className="text-[8px] font-mono text-gray-800 uppercase tracking-widest leading-relaxed">
                  Neural Sync Active <br /> SSL Protected Flow
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
