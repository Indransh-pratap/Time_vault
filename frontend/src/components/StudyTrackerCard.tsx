import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';
import api from '../lib/api';
import { useClickSound } from '../hooks/useClickSound';
import { useSocket } from '../context/SocketContext';

const LS_KEY_ELAPSED  = 'tv_timer_elapsed';
const LS_KEY_SESSION  = 'tv_timer_sessionId';
const LS_KEY_ACTIVE   = 'tv_timer_active';
const LS_KEY_STARTED  = 'tv_timer_startedAt';

// Timezone offset minutes east of UTC  (IST = +330)
const TZ_OFFSET = new Date().getTimezoneOffset() * -1;

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
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

const StudyTrackerCard: React.FC = () => {
  const [isActive,   setIsActive]   = useState(() => localStorage.getItem(LS_KEY_ACTIVE) === 'true');
  const [elapsed,    setElapsed]    = useState(() => restoreElapsed());
  const [sessionId,  setSessionId]  = useState<string | null>(() => localStorage.getItem(LS_KEY_SESSION));
  const [totalToday, setTotalToday] = useState(0);

  const runStartRef = useRef<number>(Date.now() - elapsed * 1000);
  const savingRef   = useRef(false);  // prevent duplicate PUT calls
  const playClick   = useClickSound();
  const socket      = useSocket();

  // ── Persist ──────────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(LS_KEY_ELAPSED, String(elapsed)); }, [elapsed]);
  useEffect(() => {
    localStorage.setItem(LS_KEY_ACTIVE, String(isActive));
    if (isActive) localStorage.setItem(LS_KEY_STARTED, String(runStartRef.current));
  }, [isActive]);
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

  // ── Fetch today total ─────────────────────────────────────────────────────
  const fetchTodayTotal = useCallback(async () => {
    try {
      const { data } = await api.get(`/timer/today?tz=${TZ_OFFSET}`);
      const total = (data as any[]).reduce((acc, s) => acc + (s.duration || 0), 0);
      setTotalToday(total);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchTodayTotal(); }, [fetchTodayTotal]);

  // Real-time: update when another timer instance saves a session
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { total?: number }) => {
      if (data.total !== undefined) setTotalToday(data.total);
      else fetchTodayTotal();
    };
    socket.on('study:sync', handler);
    return () => { socket.off('study:sync', handler); };
  }, [socket, fetchTodayTotal]);

  // ── START ─────────────────────────────────────────────────────────────────
  const handleStart = () => {
    playClick();
    runStartRef.current = Date.now() - elapsed * 1000;
    setIsActive(true);
    if (!sessionId) {
      api.post('/timer/session', { timezoneOffset: TZ_OFFSET })
        .then(({ data }) => { setSessionId(data._id); localStorage.setItem(LS_KEY_SESSION, data._id); })
        .catch(err => console.error('[Timer] Session create failed:', err?.message));
    }
  };

  // ── PAUSE ─────────────────────────────────────────────────────────────────
  const handlePause = () => {
    playClick(600, 0.04, 0.1);
    setIsActive(false);
    if (sessionId && !savingRef.current) {
      savingRef.current = true;
      api.put(`/timer/session/${sessionId}`, { duration: elapsed })
        .then(({ data }) => {
          fetchTodayTotal();
          socket?.emit('study:update', { date: data.date, total: data.duration });
        })
        .catch(err => console.error('[Timer] Pause sync failed:', err?.message))
        .finally(() => { savingRef.current = false; });
    }
  };

  // ── STOP ──────────────────────────────────────────────────────────────────
  const handleStop = () => {
    playClick(400, 0.06, 0.08);
    setIsActive(false);
    const finalElapsed = elapsed;
    const finalId      = sessionId;
    setElapsed(0);
    setSessionId(null);
    runStartRef.current = Date.now();
    localStorage.setItem(LS_KEY_ELAPSED, '0');
    localStorage.removeItem(LS_KEY_STARTED);
    if (finalId && !savingRef.current) {
      savingRef.current = true;
      api.put(`/timer/session/${finalId}`, { duration: finalElapsed })
        .then(({ data }) => {
          fetchTodayTotal();
          socket?.emit('study:update', { date: data.date, total: data.duration });
        })
        .catch(err => console.error('[Timer] Stop sync failed:', err?.message))
        .finally(() => { savingRef.current = false; });
    }
  };

  const totalDisplay = totalToday + (isActive ? elapsed : 0);

  return (
    <div className="bg-[#111] border border-[#E50914]/20 rounded-lg p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-[#E50914]/50 hover:shadow-[0_4px_25px_rgba(229,9,20,0.15)] transition-all">
      {/* Left — today total */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-[#E50914]/10 rounded-full border border-[#E50914]/30 shadow-[0_0_10px_rgba(229,9,20,0.2)] flex-shrink-0">
          <Clock className="text-[#E50914]" size={24} />
        </div>
        <div>
          <h3 className="text-gray-400 font-mono tracking-widest text-xs uppercase">Today's Study Time</h3>
          <div className="text-2xl font-bold text-white tracking-wider font-mono">{formatTime(totalDisplay)}</div>
        </div>
      </div>

      {/* Right — session timer + controls */}
      <div className="flex items-center gap-5">
        <div className={`text-3xl md:text-4xl w-36 text-center font-mono font-bold tracking-widest select-none transition-colors ${isActive ? 'text-[#E50914]' : 'text-gray-400'}`}>
          {formatTime(elapsed)}
          {isActive && <span className="ml-1 inline-block w-2 h-2 rounded-full bg-[#E50914] animate-ping" />}
        </div>
        <div className="flex gap-3 items-center">
          {!isActive ? (
            <button onClick={handleStart} className="w-12 h-12 flex items-center justify-center rounded-sm bg-[#111] border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white hover:shadow-[0_0_15px_rgba(34,197,94,0.8)] active:scale-95 transition-all">
              <Play size={20} fill="currentColor" className="ml-0.5" />
            </button>
          ) : (
            <button onClick={handlePause} className="w-12 h-12 flex items-center justify-center rounded-sm bg-[#111] border-2 border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white hover:shadow-[0_0_15px_rgba(229,9,20,0.8)] active:scale-95 transition-all">
              <Pause size={20} fill="currentColor" />
            </button>
          )}
          <button onClick={handleStop} disabled={elapsed === 0 && !isActive}
            className="w-11 h-11 flex items-center justify-center rounded-sm bg-[#111] border border-gray-600 text-gray-500 hover:border-white hover:text-white active:scale-95 transition-all disabled:opacity-25 disabled:cursor-not-allowed">
            <Square size={16} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyTrackerCard;
