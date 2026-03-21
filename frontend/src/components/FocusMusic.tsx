import { useState } from 'react';
import { Music, Headphones, ListMusic, Play, Pause, Youtube, Plus, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMusic, type Track } from '../context/MusicContext';
import toast from 'react-hot-toast';

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCAL_TRACKS: Track[] = [
  { id: 'lofi',  title: 'Lofi Chill',  url: '/music/lofi.mp3',  type: 'local' },
  { id: 'rain',  title: 'Rain Ambient', url: '/music/rain.mp3',  type: 'local' },
  { id: 'focus', title: 'Deep Focus',  url: '/music/focus.mp3', type: 'local' },
];

const PRESETS = [
  { name: 'Lofi', icon: '🎧', color: '#ff6b35' },
  { name: 'Rain', icon: '🌧️', color: '#45A29E' },
  { name: 'Zen',  icon: '🧘', color: '#66FCF1' },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function FocusMusic() {
  const { currentTrack, isPlaying, volume, setTrack, play, pause, setVolume } = useMusic();
  const [ytUrl, setYtUrl] = useState('');

  const handleAddYoutube = () => {
    const match = ytUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    const videoId = match ? match[1] : null;

    if (videoId) {
      const newTrack: Track = {
        id: `yt-${videoId}`,
        title: 'YouTube Audio',
        url: videoId,
        type: 'youtube',
      };
      setTrack(newTrack);
      setYtUrl('');
      toast.success('YouTube track loaded!');
    } else {
      toast.error('Invalid YouTube URL');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white font-mono flex items-center gap-3">
            <Headphones className="text-cyan-400" /> Focus Music
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-1 uppercase tracking-wider">
            Curated audio to lock in your concentration
          </p>
        </div>
      </div>

      {/* Main Player Card */}
      <div className="relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none" />
        <div className="glass-card border border-white/5 p-8 flex flex-col md:flex-row items-center gap-8 relative z-10 transition-all group-hover:border-cyan-500/20">
          
          {/* Visualizer Mock / Album Art */}
          <div className="w-48 h-48 rounded-2xl bg-black border border-white/10 flex items-center justify-center relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className={`absolute inset-0 bg-cyan-500/5 transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0'}`} />
            <div className="p-10 border-2 border-dashed border-gray-800 rounded-full animate-spin-slow">
              <div className="p-8 border-2 border-gray-900 rounded-full">
                <Music size={40} className={isPlaying ? 'text-cyan-400' : 'text-gray-700'} />
              </div>
            </div>
            {isPlaying && (
              <div className="absolute bottom-4 flex items-end gap-1 h-8">
                {[0.4, 0.8, 0.5, 1, 0.6, 0.9].map((h, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [`${h*100}%`, '20%', `${h*100}%`] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 bg-cyan-500/60 rounded-full"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Player Info & Controls */}
          <div className="flex-1 space-y-6 w-full text-center md:text-left">
            <div>
              <span className="px-2 py-0.5 rounded-sm bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono uppercase tracking-[0.2em] mb-2 inline-block">
                Now Playing
              </span>
              <h3 className="text-2xl font-bold text-white font-mono tracking-wider truncate max-w-md">
                {currentTrack.title}
              </h3>
              <p className="text-xs text-gray-500 font-mono uppercase tracking-widest mt-1">
                Source: {currentTrack.type}
              </p>
            </div>

            {/* Progress / Volume Mock */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setVolume(Math.max(0, volume - 0.1))} className="text-gray-600 hover:text-white transition-colors">
                  <Volume2 size={16} />
                </button>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative group/vol cursor-pointer">
                  <input
                    type="range" min="0" max="1" step="0.01" value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="absolute top-0 left-0 h-full bg-cyan-500 transition-all" style={{ width: `${volume * 100}%` }} />
                </div>
                <span className="text-[10px] font-mono text-gray-600 tabular-nums">{Math.round(volume * 100)}%</span>
              </div>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-6 pt-2">
              <button 
                onClick={isPlaying ? pause : play}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isPlaying 
                    ? 'bg-cyan-500 text-black shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-105' 
                    : 'bg-white/5 border border-white/20 text-white hover:border-cyan-500/50 hover:bg-cyan-500/5 hover:scale-105'
                }`}
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Local library */}
        <div className="space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-widest text-[#E50914] flex items-center gap-2">
            <ListMusic size={16} /> Internal Library
          </h3>
          <div className="space-y-2">
            {LOCAL_TRACKS.map((track) => (
              <button
                key={track.id}
                onClick={() => setTrack(track)}
                className={`w-full flex items-center justify-between p-4 rounded-sm border transition-all ${
                  currentTrack.id === track.id
                    ? 'bg-cyan-500/5 border-cyan-500/40 text-cyan-400'
                    : 'bg-[#0f0f0f] border-white/5 text-gray-500 hover:border-white/10 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Music size={14} className={currentTrack.id === track.id ? 'text-cyan-400' : 'text-gray-700'} />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">{track.title}</span>
                </div>
                {currentTrack.id === track.id && isPlaying && (
                   <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest animate-pulse">Active</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* YouTube addition */}
        <div className="space-y-4">
          <h3 className="text-sm font-mono uppercase tracking-widest text-red-600 flex items-center gap-2">
            <Youtube size={16} /> Link Stream
          </h3>
          <div className="glass-card border border-white/5 p-6 space-y-4 bg-red-900/5 transition-all hover:border-red-500/20">
            <p className="text-[11px] font-mono text-gray-500 leading-relaxed uppercase tracking-wider">
              Paste a YouTube URL to stream any track directly into your session.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://youtube.com/watch?v=..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                className="flex-1 bg-black border border-white/10 rounded-sm px-4 py-2.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-red-500/50"
              />
              <button
                onClick={handleAddYoutube}
                className="px-4 py-2.5 bg-red-600 text-white font-mono uppercase tracking-widest text-xs font-black transition-all hover:bg-red-700 shadow-[0_0_15px_rgba(220,38,38,0.2)] active:scale-95"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => toast.success(`Preset '${p.name}' selected (Stub)`)}
                className="bg-black border border-white/5 p-4 rounded-sm flex flex-col items-center gap-2 hover:border-white/20 transition-all opacity-50 cursor-pointer group"
              >
                <span className="text-xl group-hover:scale-125 transition-transform">{p.icon}</span>
                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
