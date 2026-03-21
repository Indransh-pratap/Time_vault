import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, RotateCcw, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useClickSound } from '../hooks/useClickSound';

// ─── Shared localStorage keys (same as FloatingTimer & StudyTrackerCard) ──────
const LS_KEY_ELAPSED  = 'tv_timer_elapsed';
const LS_KEY_SESSION  = 'tv_timer_sessionId';
const LS_KEY_ACTIVE   = 'tv_timer_active';
const LS_KEY_STARTED  = 'tv_timer_startedAt';

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

// ─── Motivational quotes ──────────────────────────────────────────────────────
const QUOTES = [
  'Discipline is choosing between what you want now and what you want most.',
  'The expert at anything was once a beginner.',
  'Focus on progress, not perfection.',
  'Deep work is the superpower of the 21st century.',
  'You don\'t rise to the level of your goals. You fall to the level of your systems.',
  'Every hour of focused effort compounds over time.',
  'Silence is a source of great strength.',
  'Success is the sum of small efforts, repeated day in and day out.',
];

// ─────────────────────────────────────────────────────────────────────────────

interface FocusModeProps {
  onClose: () => void;
}

export default function FocusMode({ onClose }: FocusModeProps) {
  const [isActive,  setIsActive]  = useState(() => localStorage.getItem(LS_KEY_ACTIVE) === 'true');
  const [elapsed,   setElapsed]   = useState(() => restoreElapsed());
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(LS_KEY_SESSION));
  const [quote,     setQuote]     = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [pulseRing, setPulseRing] = useState(false);

  const runStartRef = useRef<number>(Date.now() - elapsed * 1000);
  const playClick   = useClickSound();

  // ── Escape key to close ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Tick ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      const now = Date.now();
      setElapsed(Math.floor((now - runStartRef.current) / 1000));
      localStorage.setItem(LS_KEY_ELAPSED, String(Math.floor((now - runStartRef.current) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [isActive]);

  // ── Persist active state ───────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(LS_KEY_ACTIVE, String(isActive));
    if (isActive) localStorage.setItem(LS_KEY_STARTED, String(runStartRef.current));
  }, [isActive]);

  useEffect(() => {
    if (sessionId) localStorage.setItem(LS_KEY_SESSION, sessionId);
    else           localStorage.removeItem(LS_KEY_SESSION);
  }, [sessionId]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    playClick();
    runStartRef.current = Date.now() - elapsed * 1000;
    setIsActive(true);
    setPulseRing(true);
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);

    if (!sessionId) {
      api.post('/timer/session', { startTime: new Date(), date: new Date().toISOString().split('T')[0] })
        .then(({ data }) => { setSessionId(data._id); localStorage.setItem(LS_KEY_SESSION, data._id); })
        .catch(console.error);
    }
  }, [elapsed, sessionId, playClick]);

  const handlePause = useCallback(() => {
    playClick(600, 0.04, 0.1);
    setIsActive(false);
    setPulseRing(false);
    if (sessionId) {
      api.put(`/timer/session/${sessionId}`, { endTime: new Date(), duration: elapsed }).catch(console.error);
    }
  }, [sessionId, elapsed, playClick]);

  const handleReset = useCallback(() => {
    playClick(400, 0.06, 0.08);
    setIsActive(false);
    setPulseRing(false);
    const fe = elapsed, fi = sessionId;
    setElapsed(0);
    setSessionId(null);
    runStartRef.current = Date.now();
    localStorage.setItem(LS_KEY_ELAPSED, '0');
    localStorage.removeItem(LS_KEY_STARTED);
    if (fi) {
      api.put(`/timer/session/${fi}`, { endTime: new Date(), duration: fe }).catch(console.error);
    }
  }, [elapsed, sessionId, playClick]);

  // ── Prevent body scroll ────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const timerColor = isActive ? '#E50914' : '#4B5563';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{ background: 'radial-gradient(ellipse at center, #0d0d0d 0%, #060606 100%)' }}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 text-gray-600 hover:text-white transition-colors z-10 rounded-lg hover:bg-white/5"
      >
        <X size={22} />
      </button>

      {/* Focus Mode label */}
      <div className="absolute top-6 left-6 flex items-center gap-2 text-gray-700 font-mono text-xs uppercase tracking-widest">
        <Maximize2 size={13} />
        Focus Mode
      </div>

      {/* Breathing ring + timer */}
      <div className="relative flex items-center justify-center mb-10">
        {/* Outer pulse ring — only when active */}
        <AnimatePresence>
          {pulseRing && isActive && (
            <>
              <motion.div
                key="ring1"
                initial={{ scale: 0.8, opacity: 0.4 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
                className="absolute rounded-full border border-[#E50914]/30"
                style={{ width: 320, height: 320 }}
              />
              <motion.div
                key="ring2"
                initial={{ scale: 0.8, opacity: 0.25 }}
                animate={{ scale: 1.3, opacity: 0 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
                className="absolute rounded-full border border-[#E50914]/20"
                style={{ width: 320, height: 320 }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Inner circle */}
        <motion.div
          animate={isActive ? {
            boxShadow: [
              '0 0 30px rgba(229,9,20,0.15)',
              '0 0 60px rgba(229,9,20,0.25)',
              '0 0 30px rgba(229,9,20,0.15)',
            ],
          } : { boxShadow: '0 0 0px rgba(229,9,20,0)' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-64 h-64 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, rgba(229,9,20,0.05) 0%, transparent 70%)',
            border: `1px solid ${isActive ? 'rgba(229,9,20,0.3)' : 'rgba(255,255,255,0.05)'}`,
            transition: 'border-color 0.5s',
          }}
        >
          {/* Timer display */}
          <motion.div
            key={isActive ? 'active' : 'inactive'}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="text-center"
          >
            <div
              className="font-mono font-black tracking-widest tabular-nums leading-none"
              style={{
                fontSize: 'clamp(3rem, 8vw, 5rem)',
                color: timerColor,
                textShadow: isActive ? `0 0 30px rgba(229,9,20,0.5)` : 'none',
                transition: 'color 0.5s, text-shadow 0.5s',
              }}
            >
              {fmt(elapsed)}
            </div>
            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mt-2 flex items-center justify-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#E50914]" />
                <span className="text-[10px] font-mono text-[#E50914]/70 uppercase tracking-widest">Live</span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-5 mb-12">
        {/* Start / Pause */}
        {!isActive ? (
          <motion.button
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.93 }}
            onClick={handleStart}
            className="flex items-center gap-3 px-8 py-4 rounded-xl font-mono font-bold uppercase tracking-widest text-sm transition-all"
            style={{
              background: 'rgba(229,9,20,0.12)',
              border: '1px solid rgba(229,9,20,0.5)',
              color: '#E50914',
              boxShadow: '0 0 20px rgba(229,9,20,0.15)',
            }}
          >
            <Play size={18} fill="currentColor" className="ml-0.5" />
            {elapsed > 0 ? 'Resume' : 'Start'}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.93 }}
            onClick={handlePause}
            className="flex items-center gap-3 px-8 py-4 rounded-xl font-mono font-bold uppercase tracking-widest text-sm transition-all"
            style={{
              background: 'rgba(229,9,20,0.12)',
              border: '1px solid rgba(229,9,20,0.5)',
              color: '#E50914',
              boxShadow: '0 0 20px rgba(229,9,20,0.2)',
            }}
          >
            <Pause size={18} fill="currentColor" />
            Pause
          </motion.button>
        )}

        {/* Reset */}
        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.93 }}
          onClick={handleReset}
          disabled={elapsed === 0 && !isActive}
          className="w-14 h-14 flex items-center justify-center rounded-xl transition-all disabled:opacity-20 disabled:cursor-not-allowed"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#6B7280',
          }}
        >
          <RotateCcw size={18} />
        </motion.button>
      </div>

      {/* Motivational quote */}
      <AnimatePresence mode="wait">
        <motion.p
          key={quote}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="max-w-md text-center text-sm font-mono text-gray-600 leading-relaxed px-6"
        >
          "{quote}"
        </motion.p>
      </AnimatePresence>

      {/* Bottom hint */}
      <p className="absolute bottom-6 text-[10px] font-mono text-gray-800 uppercase tracking-widest">
        Press ESC to exit · Keep going
      </p>
    </motion.div>
  );
}
