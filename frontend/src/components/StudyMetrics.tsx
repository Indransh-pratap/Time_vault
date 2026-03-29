import { useState, useEffect, useCallback } from 'react';
import { subDays, format } from 'date-fns';
import { motion } from 'framer-motion';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { TrendingUp, Calendar } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyEntry { date: string; totalSeconds: number }
interface StatsData {
  dailyBreakdown: DailyEntry[];
  periodTotal: number;
  summary: { today: number; yesterday: number; week: number; month: number; year: number };
  startDate: string;
  endDate:   string;
}
interface AnalyticsData {
  heatmap: Record<string, { isActiveDay: boolean; totalStudyTime: number; completionRate: number; tasksCompleted: number; }>;
  totalTimeSpent: number;
  totalCompleted: number;
  studyStats:    { todaySeconds: number; weekSeconds: number; monthSeconds: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TZ_OFFSET = new Date().getTimezoneOffset() * -1;

const fmtSec = (s: number): string => {
  if (s <= 0) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
};

const fmtHms = (s: number): string => {
  const h   = Math.floor(s / 3600).toString().padStart(2, '0');
  const m   = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

type Range = 'today' | 'yesterday' | '7d' | '30d' | '6m' | '1y' | '2y';

const RANGE_LABELS: { id: Range; label: string }[] = [
  { id: 'today',     label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d',        label: '7 Days' },
  { id: '30d',       label: '30 Days' },
  { id: '6m',        label: '6 Months' },
  { id: '1y',        label: '1 Year' },
  { id: '2y',        label: '2 Years' },
];

// ─── Heatmap (kept intact from existing AnalyticsHeatmap) ────────────────────

function Heatmap({ heatmap }: { heatmap: AnalyticsData['heatmap'] }) {
  const today = new Date();
  const days  = Array.from({ length: 90 }, (_, i) => format(subDays(today, 89 - i), 'yyyy-MM-dd'));

  const getClass = (isActive: boolean) => {
    return isActive 
      ? 'bg-[#E50914] border-transparent shadow-[0_0_10px_rgba(229,9,20,0.8)] animate-pulse'
      : 'bg-[#0B0C10] border-gray-800';
  };

  return (
    <div>
      <h4 className="text-xs font-mono uppercase tracking-widest text-gray-600 mb-3">Task Activity (90 days)</h4>
      <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
        <div className="flex flex-wrap gap-1.5 min-w-[600px] bg-[#050505] p-4 rounded-sm border border-gray-900">
          {days.map((day) => {
            const dayData = heatmap[day];
            const isActive = dayData?.isActiveDay ?? false;
            const studyHours = dayData ? (dayData.totalStudyTime / 3600).toFixed(1) + 'h' : '0h';
            const compRate = dayData ? Math.round(dayData.completionRate * 100) : 0;
            const tasksDone = dayData ? dayData.tasksCompleted : 0;
            
            return (
              <div key={day}
                className={`w-4 h-4 rounded-sm border ${getClass(isActive)} transition-all duration-300 hover:scale-150 hover:z-10 cursor-crosshair relative group`}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1 bg-black border border-[#E50914] text-[#E50914] text-[10px] font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-[0_0_15px_rgba(229,9,20,0.5)]">
                  {day} · {studyHours} study | {compRate}% tasks done ({tasksDone})
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-gray-600 mt-2 font-mono uppercase tracking-widest px-1">
          <span>90 Days Ago</span><span>Today</span>
        </div>
      </div>
    </div>
  );
}

// ─── Daily Breakdown Bar ──────────────────────────────────────────────────────

function BreakdownBar({ entries, maxSec }: { entries: DailyEntry[]; maxSec: number }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-10 text-gray-700 font-mono text-sm uppercase tracking-widest">
        No study sessions in this range
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
      {[...entries].reverse().map(({ date, totalSeconds }) => {
        const pct = maxSec > 0 ? Math.round((totalSeconds / maxSec) * 100) : 0;
        return (
          <div key={date} className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-600 w-24 flex-shrink-0 tabular-nums">{date}</span>
            <div className="flex-1 h-5 bg-black/40 rounded-sm overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-sm"
                style={{
                  background: pct > 80 ? 'linear-gradient(90deg, #E50914, #ff4444)'
                            : pct > 40 ? 'linear-gradient(90deg, #8b0000, #E50914)'
                            : 'rgba(229,9,20,0.4)',
                }}
              />
            </div>
            <span className="text-[11px] font-mono text-gray-400 w-16 text-right tabular-nums flex-shrink-0">
              {fmtSec(totalSeconds)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StudyMetrics() {
  const [range,     setRange]     = useState<Range>('7d');
  const [stats,     setStats]     = useState<StatsData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [syncing,   setSyncing]   = useState(false);
  const socket = useSocket();

  // ── Fetch stats for selected range ────────────────────────────────────────
  const fetchStats = useCallback(async (r: Range) => {
    setSyncing(true);
    try {
      const { data } = await api.get<StatsData>(`/timer/stats?range=${r}&tz=${TZ_OFFSET}`);
      setStats(data);
    } catch {
      toast.error('Failed to load study stats');
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  // ── Fetch task heatmap ────────────────────────────────────────────────────
  useEffect(() => {
    api.get<AnalyticsData>('/analytics')
      .then(({ data }) => setAnalytics(data))
      .catch(() => {/* silent */});
  }, []);

  useEffect(() => { fetchStats(range); }, [range, fetchStats]);

  // ── Real-time: update metrics on metrics:update ───────────────────────────
  useEffect(() => {
    if (!socket) return;
    const fetchAll = () => {
      fetchStats(range);
      api.get<AnalyticsData>('/analytics').then(({ data }) => setAnalytics(data)).catch(()=>{});
    };
    
    socket.on('study:sync', fetchAll);
    socket.on('metrics:update', fetchAll);
    return () => { 
      socket.off('study:sync', fetchAll); 
      socket.off('metrics:update', fetchAll); 
    };
  }, [socket, range, fetchStats]);

  const maxSec = Math.max(...(stats?.dailyBreakdown.map(d => d.totalSeconds) ?? [0]), 1);

  // ── Summary cards ─────────────────────────────────────────────────────────
  const summaryCards = stats ? [
    { label: 'Today',     value: fmtHms(stats.summary.today),     sub: fmtSec(stats.summary.today),     color: '#E50914' },
    { label: 'Yesterday', value: fmtHms(stats.summary.yesterday),  sub: fmtSec(stats.summary.yesterday),  color: '#ff6b35' },
    { label: 'This Week', value: fmtHms(stats.summary.week),       sub: fmtSec(stats.summary.week),       color: '#45A29E' },
    { label: 'This Month',value: fmtHms(stats.summary.month),      sub: fmtSec(stats.summary.month),      color: '#66FCF1' },
    { label: 'This Year', value: fmtHms(stats.summary.year),       sub: fmtSec(stats.summary.year),       color: '#C5C6C7' },
  ] : [];

  return (
    <div className="flex flex-col gap-6 w-full relative z-10">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold uppercase tracking-widest text-white border-b-2 border-gray-900 pb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-[#E50914]" /> Temporal Metrics
        </h3>
        {syncing && <span className="text-[10px] font-mono text-gray-600 animate-pulse uppercase tracking-widest">Syncing…</span>}
      </div>

      {loading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-[#111] border border-gray-800 rounded-sm" />)}
          </div>
          <div className="h-40 bg-[#111] border border-gray-800 rounded-sm" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {summaryCards.map(({ label, value, sub, color }) => (
              <motion.div key={label}
                whileHover={{ y: -2 }}
                className="bg-[#111] border border-white/5 rounded-sm p-3 relative overflow-hidden group hover:border-white/10 transition-all"
              >
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: color, opacity: 0.6 }} />
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-lg font-bold font-mono tabular-nums" style={{ color }}>{value}</p>
                <p className="text-[10px] font-mono text-gray-700">{sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Range Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={13} className="text-gray-600" />
            {RANGE_LABELS.map(({ id, label }) => (
              <button key={id} onClick={() => setRange(id)}
                className={`px-3 py-1 rounded-sm font-mono text-[11px] uppercase tracking-wider transition-all ${
                  range === id
                    ? 'bg-[#E50914]/15 border border-[#E50914]/50 text-[#E50914]'
                    : 'bg-white/3 border border-white/8 text-gray-600 hover:text-gray-400 hover:border-white/15'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Period Total + Breakdown */}
          <div className="bg-[#111] border border-white/5 rounded-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
                  {RANGE_LABELS.find(r => r.id === range)?.label} Total
                </p>
                <p className="text-2xl font-bold font-mono text-[#E50914] tabular-nums">
                  {fmtHms(stats?.periodTotal ?? 0)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Sessions</p>
                <p className="text-lg font-bold font-mono text-white">{stats?.dailyBreakdown.length ?? 0} days</p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3">
              <p className="text-[10px] font-mono text-gray-700 uppercase tracking-widest mb-3">Daily Breakdown</p>
              <BreakdownBar entries={stats?.dailyBreakdown ?? []} maxSec={maxSec} />
            </div>
          </div>

          {/* Task Heatmap — preserved from original */}
          {analytics && (
            <div className="bg-[#111] border border-white/5 rounded-sm p-4">
              <Heatmap heatmap={analytics.heatmap} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
