import { Music, Headphones, ListMusic, Play } from 'lucide-react';
import { motion } from 'framer-motion';

// ─── Future data structure (ready for backend integration) ───────────────────
// interface Track {
//   id: string;
//   title: string;
//   artist: string;
//   duration: number;   // seconds
//   url: string;
// }

// interface FocusPlaylist {
//   title: string;
//   tracks: Track[];
//   playing: boolean;
//   currentTrackIndex: number;
// }

// Sample state shape for when music is implemented:
const _musicStructure = {
  title: 'Focus Playlist',
  tracks: [],            // Track[]
  playing: false,
};

// Suppress unused-variable warning
void _musicStructure;

// ─── Placeholder genre cards ─────────────────────────────────────────────────
const FUTURE_PLAYLISTS = [
  { icon: '🧠', name: 'Deep Focus',   desc: 'Alpha waves & ambient' },
  { icon: '⚡', name: 'High Energy',   desc: 'BPM 120+ productivity' },
  { icon: '🌊', name: 'Lo-Fi Chill',  desc: 'Rain, café, lo-fi beats' },
  { icon: '🌿', name: 'Nature Sounds', desc: 'Forest, water, wind' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function FocusMusic() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white font-mono">
            Focus Music
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Curated playlists to boost your concentration
          </p>
        </div>
        <span className="px-3 py-1 text-xs font-mono uppercase tracking-widest border border-yellow-600/40 text-yellow-600/80 rounded-sm">
          Coming Soon
        </span>
      </div>

      {/* Empty-state player mock */}
      <div className="bg-[#0f0f0f] border border-[#E50914]/20 rounded-sm p-8 flex flex-col items-center gap-5 text-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-gray-700 flex items-center justify-center bg-black">
            <Music size={36} className="text-gray-700" />
          </div>
          {/* Fake vinyl groove rings */}
          <div className="absolute inset-0 rounded-full border border-gray-800/60 scale-110" />
          <div className="absolute inset-0 rounded-full border border-gray-800/40 scale-125" />
        </div>

        <div className="space-y-1">
          <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">No track playing</p>
          <p className="text-gray-700 font-mono text-xs">Music integration coming in the next update</p>
        </div>

        {/* Fake controls */}
        <div className="flex items-center gap-6 opacity-30 pointer-events-none">
          <ListMusic size={20} className="text-gray-500" />
          <button className="w-12 h-12 rounded-full border-2 border-gray-700 flex items-center justify-center">
            <Play size={20} className="text-gray-500 ml-1" />
          </button>
          <Headphones size={20} className="text-gray-500" />
        </div>
      </div>

      {/* Future Playlist Cards */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-3 flex items-center gap-2">
          <ListMusic size={12} /> Available Playlists
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FUTURE_PLAYLISTS.map((pl, i) => (
            <motion.div
              key={pl.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="relative flex items-center gap-4 p-4 bg-[#0a0a0a] border border-gray-800 rounded-sm overflow-hidden group cursor-not-allowed"
            >
              {/* Subtle hover shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

              <div className="text-2xl">{pl.icon}</div>
              <div>
                <p className="text-sm font-mono text-gray-400 font-bold tracking-wider">{pl.name}</p>
                <p className="text-xs text-gray-700 font-mono">{pl.desc}</p>
              </div>

              {/* Coming-soon badge */}
              <span className="ml-auto text-xs font-mono text-gray-700 uppercase tracking-wider">Soon</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-700 font-mono text-center pt-2">
        🎵 Music integration is scaffolded and ready · Tracks will stream directly in-app
      </p>
    </div>
  );
}
