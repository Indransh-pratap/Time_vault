import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useClickSound } from '../hooks/useClickSound';
import { useSocket } from '../context/SocketContext';

// ─── Shared localStorage keys (same across FloatingTimer / StudyTrackerCard / FocusMode)
const LS_KEY_ELAPSED  = 'tv_timer_elapsed';
const LS_KEY_SESSION  = 'tv_timer_sessionId';
const LS_KEY_ACTIVE   = 'tv_timer_active';
const LS_KEY_STARTED  = 'tv_timer_startedAt';
const LS_KEY_EXPANDED = 'tv_float_expanded';

const fmt = (s: number) => {
  const h   = Math.floor(s / 3600).toString().padStart(2, '0');
  const m   = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

const restoreElapsed = (): number => {
  const savedElapsed   = Number(localStorage.getItem(LS_KEY_ELAPSED) || 0);
  const savedActive    = localStorage.getItem(LS_KEY_ACTIVE) === 'true';
  const savedStartedAt = Number(localStorage.getItem(LS_KEY_STARTED) || 0);
  if (savedActive && savedStartedAt) {
    return savedElapsed + Math.floor((Date.now() - savedStartedAt) / 1000);
  }
  return savedElapsed;
};

// Timezone offset in minutes east of UTC (e.g. IST = +330)
const TZ_OFFSET = new Date().getTimezoneOffset() * -1;

// ─────────────────────────────────────────────────────────────────────────────

export default function FloatingTimer() {
  const [expanded,  setExpanded]  = useState(() => localStorage.getItem(LS_KEY_EXPANDED) === 'true');
  const [isActive,  setIsActive]  = useState(() => localStorage.getItem(LS_KEY_ACTIVE) === 'true');
  const [elapsed,   setElapsed]   = useState(() => restoreElapsed());
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(LS_KEY_SESSION));

  const runStartRef    = useRef<number>(Date.now() - elapsed * 1000);
  const savingRef      = useRef(false); // prevent duplicate saves
  const playClick      = useClickSound();
  const socket         = useSocket();

  // ── Persist ──────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(LS_KEY_ELAPSED, String(elapsed)); }, [elapsed]);
  useEffect(() => {
    localStorage.setItem(LS_KEY_ACTIVE, String(isActive));
    if (isActive) localStorage.setItem(LS_KEY_STARTED, String(runStartRef.current));
  }, [isActive]);
  useEffect(() => { localStorage.setItem(LS_KEY_EXPANDED, String(expanded)); }, [expanded]);
  useEffect(() => {
    if (sessionId) localStorage.setItem(LS_KEY_SESSION, sessionId);
    else           localStorage.removeItem(LS_KEY_SESSION);
  }, [sessionId]);

  // ── Tick ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - runStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  // ── START ─────────────────────────────────────────────────────────────────
  const handleStart = () => {
    playClick();
    runStartRef.current = Date.now() - elapsed * 1000;
    setIsActive(true);
    if (!sessionId) {
      api.post('/timer/session', { timezoneOffset: TZ_OFFSET })
        .then(({ data }) => { setSessionId(data._id); localStorage.setItem(LS_KEY_SESSION, data._id); })
        .catch(console.error);
    }
  };

  // ── PAUSE ─────────────────────────────────────────────────────────────────
  const handlePause = useCallback(() => {
    playClick(600, 0.04, 0.1);
    setIsActive(false);
    if (sessionId && !savingRef.current) {
      savingRef.current = true;
      api.put(`/timer/session/${sessionId}`, { duration: elapsed })
        .then(({ data }) => {
          socket?.emit('study:update', { date: data.date, total: data.duration });
        })
        .catch(console.error)
        .finally(() => { savingRef.current = false; });
    }
  }, [sessionId, elapsed, playClick, socket]);

  // ── STOP ──────────────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    playClick(400, 0.06, 0.08);
    setIsActive(false);
    const fe = elapsed, fi = sessionId;
    setElapsed(0);
    setSessionId(null);
    runStartRef.current = Date.now();
    localStorage.setItem(LS_KEY_ELAPSED, '0');
    localStorage.removeItem(LS_KEY_STARTED);
    if (fi && !savingRef.current) {
      savingRef.current = true;
      api.put(`/timer/session/${fi}`, { duration: fe })
        .then(({ data }) => {
          socket?.emit('study:update', { date: data.date, total: data.duration });
        })
        .catch(console.error)
        .finally(() => { savingRef.current = false; });
    }
  }, [elapsed, sessionId, playClick, socket]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
      className="fixed bottom-6 right-6 z-[8000] select-none"
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative overflow-hidden rounded-xl border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.8)]"
        style={{ background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)' }}
      >
        {isActive && (
          <div className="absolute inset-0 rounded-xl border border-[#E50914]/40 shadow-[inset_0_0_20px_rgba(229,9,20,0.08)] pointer-events-none" />
        )}

        {/* Collapsed header */}
        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer group" onClick={() => setExpanded((e) => !e)}>
          <div className={`p-1.5 rounded-md ${isActive ? 'bg-[#E50914]/20' : 'bg-white/5'}`}>
            <Clock size={14} className={isActive ? 'text-[#E50914]' : 'text-gray-500'} />
          </div>
          <span className={`font-mono text-base font-bold tracking-widest tabular-nums ${isActive ? 'text-[#E50914]' : 'text-gray-400'}`}>
            {fmt(elapsed)}
          </span>
          {isActive && <span className="inline-block w-2 h-2 rounded-full bg-[#E50914] animate-ping opacity-70" />}
          <div className="ml-auto text-gray-600 group-hover:text-gray-400 transition-colors">
            {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </div>
        </div>

        {/* Expanded panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-white/5"
            >
              <div className="px-4 py-4 space-y-4">
                <div className={`text-4xl font-bold text-center font-mono tracking-widest tabular-nums ${isActive ? 'text-[#E50914]' : 'text-gray-500'}`}>
                  {fmt(elapsed)}
                </div>
                <div className="flex items-center justify-center gap-3">
                  {!isActive ? (
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handleStart}
                      className="w-11 h-11 flex items-center justify-center rounded-lg bg-green-500/10 border border-green-500/50 text-green-400 hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all">
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </motion.button>
                  ) : (
                    <motion.button whileTap={{ scale: 0.9 }} onClick={handlePause}
                      className="w-11 h-11 flex items-center justify-center rounded-lg bg-[#E50914]/10 border border-[#E50914]/50 text-[#E50914] hover:bg-[#E50914]/20 hover:shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all">
                      <Pause size={18} fill="currentColor" />
                    </motion.button>
                  )}
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleStop}
                    disabled={elapsed === 0 && !isActive}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-gray-500 hover:border-white/30 hover:text-white transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                    <Square size={14} fill="currentColor" />
                  </motion.button>
                </div>
                <p className="text-center text-[10px] font-mono text-gray-700 uppercase tracking-widest">Study Session</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
