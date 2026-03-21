import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellOff, Plus, Trash2, Clock, BellRing, X, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Alarm {
  _id: string;
  time: string;       // "HH:MM"
  label: string;
  active: boolean;
  timezone: string;
  createdAt: string;
}

// ─── Utility: generate soft beep sound via Web Audio API ────────────────────

function createAlarmSound(): () => void {
  const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  const playBeep = (freq: number, start: number, duration: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + start + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.1);
  };

  // Pattern: three ascending beeps, repeated 3 times
  for (let rep = 0; rep < 3; rep++) {
    const base = rep * 1.0;
    playBeep(880, base + 0.0, 0.25);
    playBeep(1100, base + 0.3, 0.25);
    playBeep(1320, base + 0.6, 0.35);
  }

  return () => {
    try { ctx.close(); } catch (_) { /* ignore */ }
  };
}

// ─── Utility: get current time in HH:MM for a timezone ──────────────────────

function getCurrentTimeInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AlarmClock() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState('07:00');
  const [label, setLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [triggeredAlarm, setTriggeredAlarm] = useState<Alarm | null>(null);
  const [currentTime, setCurrentTime] = useState('');

  const stopSoundRef = useRef<(() => void) | null>(null);
  const firedRef = useRef<Set<string>>(new Set()); // tracks alarms fired this minute
  const socket = useSocket();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ── Fetch alarms on mount ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<Alarm[]>('/alarm');
        setAlarms(data);
      } catch (err) {
        console.error('[AlarmClock] fetch:', err);
        toast.error('Failed to load alarms');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Socket.io: listen for real-time alarm sync from other devices ──────────
  useEffect(() => {
    if (!socket) return;

    const handleSync = (payload: { action: string; alarm?: Alarm; alarmId?: string }) => {
      if (payload.action === 'created' && payload.alarm) {
        setAlarms((prev) => [payload.alarm!, ...prev]);
      } else if (payload.action === 'updated' && payload.alarm) {
        setAlarms((prev) =>
          prev.map((a) => (a._id === payload.alarm!._id ? payload.alarm! : a))
        );
      } else if (payload.action === 'deleted' && payload.alarmId) {
        setAlarms((prev) => prev.filter((a) => a._id !== payload.alarmId));
      }
    };

    socket.on('alarm:sync', handleSync);
    return () => { socket.off('alarm:sync', handleSync); };
  }, [socket]);

  // ── setInterval: check time every second ─────────────────────────────────
  const triggerAlarm = useCallback((alarm: Alarm) => {
    stopSoundRef.current?.();
    stopSoundRef.current = createAlarmSound();
    setTriggeredAlarm(alarm);
    setShowModal(true);

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification(`⏰ ${alarm.label || 'Alarm'}`, {
        body: `It's ${alarm.time}!`,
        icon: '/vite.svg',
      });
    }
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      const now = getCurrentTimeInTimezone(userTimezone);
      setCurrentTime(now);

      alarms.forEach((alarm) => {
        if (!alarm.active) return;
        const alarmTimeInUserTz = now; // compare in user's local time
        if (alarm.time === alarmTimeInUserTz && !firedRef.current.has(alarm._id)) {
          firedRef.current.add(alarm._id);
          triggerAlarm(alarm);
        }
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [alarms, userTimezone, triggerAlarm]);

  // Reset fired set every minute (when seconds roll over to :00)
  useEffect(() => {
    const resetFired = setInterval(() => {
      // Reset at each new minute so alarms can fire again tomorrow
      const secs = new Date().getSeconds();
      if (secs === 0) firedRef.current.clear();
    }, 1000);
    return () => clearInterval(resetFired);
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Add alarm ──────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!time) { toast.error('Please set an alarm time'); return; }
    setAdding(true);
    try {
      const { data: newAlarm } = await api.post<Alarm>('/alarm', {
        time,
        label: label.trim() || 'Alarm',
        active: true,
        timezone: userTimezone,
      });
      setAlarms((prev) => [newAlarm, ...prev]);
      // Socket broadcast so other devices update
      socket?.emit('alarm:update', { action: 'created', alarm: newAlarm });
      setLabel('');
      setTime('07:00');
      toast.success(`Alarm set for ${newAlarm.time}`);
    } catch (err) {
      console.error('[AlarmClock] create:', err);
      toast.error('Failed to create alarm');
    } finally {
      setAdding(false);
    }
  };

  // ── Toggle alarm ──────────────────────────────────────────────────────────
  const handleToggle = async (alarm: Alarm) => {
    const optimistic = alarms.map((a) =>
      a._id === alarm._id ? { ...a, active: !a.active } : a
    );
    setAlarms(optimistic);
    try {
      const { data: updated } = await api.put<Alarm>(`/alarm/${alarm._id}`, {
        active: !alarm.active,
      });
      setAlarms((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      socket?.emit('alarm:update', { action: 'updated', alarm: updated });
    } catch {
      toast.error('Failed to update alarm');
      setAlarms((prev) => prev.map((a) => (a._id === alarm._id ? alarm : a))); // rollback
    }
  };

  // ── Delete alarm ──────────────────────────────────────────────────────────
  const handleDelete = async (alarm: Alarm) => {
    setAlarms((prev) => prev.filter((a) => a._id !== alarm._id));
    try {
      await api.delete(`/alarm/${alarm._id}`);
      socket?.emit('alarm:update', { action: 'deleted', alarmId: alarm._id });
      firedRef.current.delete(alarm._id);
      toast.success('Alarm deleted');
    } catch {
      toast.error('Failed to delete alarm');
      setAlarms((prev) => [alarm, ...prev]); // rollback
    }
  };

  // ── Dismiss modal ─────────────────────────────────────────────────────────
  const dismissAlarm = () => {
    stopSoundRef.current?.();
    stopSoundRef.current = null;
    setShowModal(false);
    setTriggeredAlarm(null);
  };

  // ── Next upcoming alarm ───────────────────────────────────────────────────
  const nextAlarm = alarms
    .filter((a) => a.active)
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header / current time ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white font-mono">
            Alarm Clock
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            {userTimezone} · {currentTime || '--:--'}
          </p>
        </div>

        {nextAlarm && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#E50914]/10 border border-[#E50914]/40 rounded-sm text-sm font-mono text-[#E50914]">
            <BellRing size={14} className="animate-pulse" />
            Next: <span className="font-bold ml-1">{nextAlarm.time}</span>
            <ChevronRight size={14} />
            <span className="text-gray-400">{nextAlarm.label}</span>
          </div>
        )}
      </div>

      {/* ── Add alarm form ────────────────────────────────────────────────── */}
      <div className="bg-[#0f0f0f] border border-[#E50914]/20 rounded-sm p-5 space-y-4">
        <h3 className="text-xs font-mono uppercase tracking-widest text-[#E50914] flex items-center gap-2">
          <Plus size={14} /> New Alarm
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Time input */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <label className="text-xs text-gray-500 font-mono uppercase tracking-wider">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="bg-[#1a1a1a] border border-gray-700 text-white font-mono text-lg rounded-sm px-3 py-2 focus:outline-none focus:border-[#E50914] transition-colors w-36"
            />
          </div>

          {/* Label input */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500 font-mono uppercase tracking-wider">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Wake up, Stand up, etc."
              maxLength={40}
              className="bg-[#1a1a1a] border border-gray-700 text-white font-mono rounded-sm px-3 py-2 focus:outline-none focus:border-[#E50914] transition-colors placeholder-gray-600 h-full"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>

          {/* Add button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-2 px-5 py-2 bg-[#E50914] text-white font-mono uppercase tracking-widest text-sm font-bold hover:bg-[#c20812] disabled:opacity-50 transition-all rounded-sm shadow-[0_0_15px_rgba(229,9,20,0.25)] hover:shadow-[0_0_25px_rgba(229,9,20,0.4)]"
            >
              <Plus size={16} />
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>

        {/* Notification hint */}
        {'Notification' in window && Notification.permission === 'denied' && (
          <p className="text-xs text-yellow-500/70 font-mono flex items-center gap-1">
            <AlertCircle size={12} /> Browser notifications blocked. Enable them for alarm popups.
          </p>
        )}
      </div>

      {/* ── Tab-closed warning ────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 text-xs text-gray-600 font-mono px-1">
        <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-yellow-600/50" />
        <span>
          Alarms only trigger while this tab is open. Keep it active, or install TimeVault as a PWA for background support.
        </span>
      </div>

      {/* ── Alarm list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center text-gray-600 font-mono py-10 text-sm">Loading alarms…</div>
      ) : alarms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Bell size={40} className="text-gray-700" />
          <p className="text-gray-600 font-mono text-sm uppercase tracking-widest">No alarms set</p>
          <p className="text-gray-700 text-xs font-mono">Add your first alarm above</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {alarms.map((alarm) => (
              <motion.div
                key={alarm._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center justify-between p-4 rounded-sm border transition-all duration-300 ${
                  alarm.active
                    ? 'bg-[#0f0f0f] border-[#E50914]/30 shadow-[0_0_12px_rgba(229,9,20,0.05)]'
                    : 'bg-[#0a0a0a] border-gray-800 opacity-50'
                }`}
              >
                {/* Left: time + label */}
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border ${
                    alarm.active ? 'border-[#E50914]/50 text-[#E50914]' : 'border-gray-700 text-gray-700'
                  }`}>
                    <Bell size={18} className={alarm.active ? 'animate-pulse' : ''} />
                  </div>

                  <div>
                    <div className={`text-2xl font-bold font-mono tracking-wider ${
                      alarm.active ? 'text-white' : 'text-gray-600'
                    }`}>
                      {alarm.time}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {alarm.label}
                      {alarm.timezone !== userTimezone && (
                        <span className="ml-2 text-yellow-600/70">({alarm.timezone})</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: toggle + delete */}
                <div className="flex items-center gap-3">
                  {/* Toggle switch */}
                  <button
                    onClick={() => handleToggle(alarm)}
                    title={alarm.active ? 'Turn off' : 'Turn on'}
                    className={`relative w-12 h-6 rounded-full border transition-all duration-300 ${
                      alarm.active
                        ? 'bg-[#E50914] border-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.4)]'
                        : 'bg-transparent border-gray-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${
                      alarm.active ? 'left-6 bg-white' : 'left-0.5 bg-gray-600'
                    }`} />
                    {alarm.active ? (
                      <Bell size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-white" />
                    ) : (
                      <BellOff size={10} className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-500" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(alarm)}
                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-sm transition-colors"
                    title="Delete alarm"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Triggered Alarm Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && triggeredAlarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative bg-[#0f0f0f] border-2 border-[#E50914] rounded-sm p-8 max-w-sm w-full mx-4 text-center shadow-[0_0_60px_rgba(229,9,20,0.5)]"
            >
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-sm border-2 border-[#E50914] animate-ping opacity-20 pointer-events-none" />

              <div className="text-[#E50914] mb-4 flex justify-center">
                <BellRing size={56} className="animate-bounce" />
              </div>

              <h2 className="text-4xl font-bold font-mono text-white mb-2 tracking-widest">
                {triggeredAlarm.time}
              </h2>

              <p className="text-lg text-gray-300 font-mono mb-1 uppercase tracking-wider">
                {triggeredAlarm.label}
              </p>

              <p className="text-xs text-gray-600 font-mono mb-8 flex items-center justify-center gap-1">
                <Clock size={10} /> {triggeredAlarm.timezone}
              </p>

              <button
                onClick={dismissAlarm}
                className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#E50914] text-white font-bold font-mono uppercase tracking-widest text-sm hover:bg-[#c20812] transition-all rounded-sm shadow-[0_0_20px_rgba(229,9,20,0.5)]"
              >
                <X size={16} /> Dismiss
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
