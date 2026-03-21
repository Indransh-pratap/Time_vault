import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';

// ── XP keyword map (mirrors backend logic) ────────────────────────────────

const XP_RULES: { keywords: string[]; xp: number }[] = [
  { keywords: ['dsa', 'leetcode', 'algorithm', 'code', 'coding', 'programming', 'dev'], xp: 20 },
  { keywords: ['nofap', 'discipline', 'streak', 'clean'],                               xp: 40 },
  { keywords: ['gym', 'workout', 'exercise', 'lift', 'run', 'cardio', 'fitness'],       xp: 10 },
  { keywords: ['diet', 'nutrition', 'meal', 'fast', 'eat'],                             xp: 5  },
];

export const getXPForTitle = (title: string): number => {
  const lower = title.toLowerCase();
  for (const rule of XP_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.xp;
  }
  return 5;
};

export interface XPState {
  totalXP: number;
  dailyXP: number;
  level: number;
  streak: number;
}

export interface UseXPReturn extends XPState {
  loading: boolean;
  /** Award XP for a completed task. Returns gained amount. */
  awardXP: (taskTitle: string) => Promise<number>;
}

export function useXP(): UseXPReturn {
  const [state, setState] = useState<XPState>({ totalXP: 0, dailyXP: 0, level: 0, streak: 0 });
  const [loading, setLoading] = useState(true);
  const socket = useSocket();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Fetch on mount
  useEffect(() => {
    api.get<XPState>('/xp')
      .then(({ data }) => { if (mountedRef.current) setState(data); })
      .catch((e) => console.error('[useXP] fetch:', e))
      .finally(() => { if (mountedRef.current) setLoading(false); });
  }, []);

  // Listen for real-time XP sync
  useEffect(() => {
    if (!socket) return;
    const handler = (data: Partial<XPState>) => {
      if (mountedRef.current) {
        setState((prev) => ({ ...prev, ...data }));
      }
    };
    socket.on('xp:sync', handler);
    return () => { socket.off('xp:sync', handler); };
  }, [socket]);

  const awardXP = useCallback(async (taskTitle: string): Promise<number> => {
    const optimisticGain = getXPForTitle(taskTitle);

    // Optimistic update (instant)
    setState((prev) => ({
      ...prev,
      totalXP: prev.totalXP + optimisticGain,
      dailyXP: Math.min(prev.dailyXP + optimisticGain, 100),
      level:   Math.floor(Math.sqrt((prev.totalXP + optimisticGain) / 10)),
    }));

    try {
      const { data } = await api.post<XPState & { gained: number }>('/xp/award', { taskTitle });
      if (mountedRef.current) setState(data);
      return data.gained ?? optimisticGain;
    } catch (err) {
      console.error('[useXP] award:', err);
      return optimisticGain;
    }
  }, []);

  return { ...state, loading, awardXP };
}
