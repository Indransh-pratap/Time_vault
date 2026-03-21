import { motion } from 'framer-motion';
import { Zap, TrendingUp, Flame } from 'lucide-react';
import type { XPState } from '../hooks/useXP';

interface XPBarProps extends XPState {
  loading?: boolean;
}

// Level → next level XP threshold
const nextLevelXP = (level: number) => (level + 1) * (level + 1) * 10;
const currentLevelXP = (level: number) => level * level * 10;

export default function XPBar({ totalXP, dailyXP, level, loading }: XPBarProps) {
  if (loading) {
    return (
      <div className="w-full h-14 rounded-md bg-black/30 border border-white/5 animate-pulse" />
    );
  }

  const curFloor  = currentLevelXP(level);
  const nextFloor = nextLevelXP(level);
  const progress  = nextFloor === curFloor ? 100 : Math.round(((totalXP - curFloor) / (nextFloor - curFloor)) * 100);
  const dailyPct  = Math.min((dailyXP / 100) * 100, 100);

  return (
    <div className="glass-card w-full p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 border border-white/5">
      {/* Level Badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E50914] to-[#ff6b35] flex items-center justify-center shadow-[0_0_18px_rgba(229,9,20,0.5)]">
            <span className="text-white font-black font-mono text-lg">{level}</span>
          </div>
          {/* Pulsing outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-[#E50914]/40 animate-ping" style={{ animationDuration: '2.5s' }} />
        </div>
        <div>
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Level</p>
          <p className="text-sm font-bold text-white font-mono leading-tight">{totalXP.toLocaleString()} XP</p>
        </div>
      </div>

      {/* XP Progress bar (level) */}
      <div className="flex-1 w-full space-y-1.5">
        <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-wider">
          <span className="flex items-center gap-1"><TrendingUp size={10} /> Level {level} → {level + 1}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-black/60 rounded-full border border-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#E50914] via-[#ff4500] to-[#ff6b35]"
            style={{ boxShadow: '0 0 10px rgba(229,9,20,0.6)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Daily XP bar */}
      <div className="shrink-0 w-full sm:w-40 space-y-1.5">
        <div className="flex justify-between text-[10px] font-mono text-gray-500 uppercase tracking-wider">
          <span className="flex items-center gap-1"><Flame size={10} className="text-orange-400" /> Daily</span>
          <span className="text-[#45A29E]">{dailyXP}<span className="text-gray-600">/100</span></span>
        </div>
        <div className="h-2 bg-black/60 rounded-full border border-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#45A29E] to-[#7fffd4]"
            style={{ boxShadow: '0 0 10px rgba(69,162,158,0.5)' }}
            initial={{ width: 0 }}
            animate={{ width: `${dailyPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* XP badge icon */}
      <div className="shrink-0 hidden sm:flex items-center gap-1 text-[#E50914]">
        <Zap size={18} className="animate-pulse" />
      </div>
    </div>
  );
}
