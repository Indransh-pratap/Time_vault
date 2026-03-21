import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock } from 'lucide-react';
import api from '../lib/api';

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const StudyTrackerCard: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [totalToday, setTotalToday] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    fetchTodayTotal();
  }, []);

  const fetchTodayTotal = async () => {
    try {
      const { data } = await api.get('/timer/today');
      const total = data.reduce((acc: number, session: any) => acc + (session.duration || 0), 0);
      setTotalToday(total);
    } catch (error) {
      console.error('Failed to fetch today sessions', error);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleStart = async () => {
    try {
      if (!sessionId) {
        const date = new Date().toISOString().split('T')[0];
        const { data } = await api.post('/timer/session', {
          startTime: new Date(),
          date
        });
        setSessionId(data._id);
        startTimeRef.current = Date.now() - elapsed * 1000;
      } else {
        startTimeRef.current = Date.now() - elapsed * 1000;
      }
      setIsActive(true);
    } catch (error) {
      console.error('Failed to start session', error);
    }
  };

  const handlePause = async () => {
    setIsActive(false);
    if (sessionId) {
      try {
        await api.put(`/timer/session/${sessionId}`, {
          endTime: new Date(),
          duration: elapsed
        });
        fetchTodayTotal();
      } catch (error) {
        console.error('Failed to pause session', error);
      }
    }
  };

  const handleStop = async () => {
    setIsActive(false);
    if (sessionId) {
      try {
        await api.put(`/timer/session/${sessionId}`, {
          endTime: new Date(),
          duration: elapsed
        });
        setElapsed(0);
        setSessionId(null);
        startTimeRef.current = null;
        fetchTodayTotal();
      } catch (error) {
        console.error('Failed to stop session', error);
      }
    }
  };

  return (
    <div className="bg-[#111] border border-[#E50914]/20 rounded-lg p-6 mb-8 flex flex-col md:flex-row items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all hover:border-[#E50914]/50 hover:shadow-[0_4px_25px_rgba(229,9,20,0.15)]">
      <div className="flex items-center gap-4 mb-4 md:mb-0">
        <div className="p-3 bg-[#E50914]/10 rounded-full border border-[#E50914]/30 shadow-[0_0_10px_rgba(229,9,20,0.2)]">
          <Clock className="text-[#E50914]" size={28} />
        </div>
        <div>
          <h3 className="text-gray-400 font-mono tracking-widest text-sm uppercase">Today's Study Time</h3>
          <div className="text-2xl font-bold text-white tracking-wider font-mono">
            {formatTime(totalToday + (isActive ? Math.floor((Date.now() - (startTimeRef.current || Date.now())) / 1000) - elapsed : 0))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className={`text-4xl w-40 text-center font-mono font-bold tracking-widest ${isActive ? 'text-glitch text-[#E50914]' : 'text-gray-300'}`}>
          {formatTime(elapsed)}
        </div>

        <div className="flex gap-3">
          {!isActive ? (
            <button 
              onClick={handleStart}
              className="w-12 h-12 flex items-center justify-center rounded-sm bg-[#111] border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white hover:shadow-[0_0_15px_rgba(34,197,94,0.8)] transition-all"
            >
              <Play size={20} className="ml-1" fill="currentColor" />
            </button>
          ) : (
            <button 
              onClick={handlePause}
              className="w-12 h-12 flex items-center justify-center rounded-sm bg-[#111] border-2 border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white hover:shadow-[0_0_15px_rgba(229,9,20,0.8)] transition-all"
            >
              <Pause size={20} fill="currentColor" />
            </button>
          )}
          <button 
            onClick={handleStop}
            disabled={elapsed === 0 && !isActive}
            className="w-12 h-12 flex items-center justify-center rounded-sm bg-[#111] border border-gray-600 text-gray-500 hover:border-white hover:text-white transition-all disabled:opacity-30 disabled:hover:border-gray-600 disabled:hover:text-gray-500 disabled:cursor-not-allowed"
          >
            <Square size={16} fill="currentColor" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyTrackerCard;
