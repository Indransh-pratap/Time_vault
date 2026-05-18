import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Plus, Trash2, Check, ChevronLeft, ChevronRight, X, LayoutGrid, Clock, Zap, Edit2 } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import MonthlyPlannerView from './MonthlyPlannerView';

// ── Types ──────────────────────────────────────────────────────
interface PlannerTask {
  _id: string;
  title: string;
  subject: string;
  target: number;
  progress: number;
  progressPercent: number;
  type: 'daily' | 'weekly' | 'monthly';
  date: string;
  completed: boolean;
  parentId?: string | null;
  _optimistic?: boolean;
}

// ── Subject color map ──────────────────────────────────────────
const SUBJECT_COLORS: Record<string, { border: string; bg: string; text: string; bar: string }> = {
  DSA:       { border: 'border-blue-500',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   bar: 'bg-blue-500'    },
  React:     { border: 'border-cyan-500',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   bar: 'bg-cyan-500'    },
  Gym:       { border: 'border-green-500',  bg: 'bg-green-500/10',  text: 'text-green-400',  bar: 'bg-green-500'   },
  College:   { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', bar: 'bg-yellow-500'  },
  Study:     { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400', bar: 'bg-orange-500'  },
  General:   { border: 'border-[#E50914]',  bg: 'bg-[#E50914]/10',  text: 'text-[#E50914]',  bar: 'bg-[#E50914]'  },
};
const getSubjectColor = (subject: string) =>
  SUBJECT_COLORS[subject] ?? { border: 'border-gray-600', bg: 'bg-gray-600/10', text: 'text-gray-400', bar: 'bg-gray-500' };

// ── Date utilities ──────────────────────────────────────────────
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const toYMD = (d: Date) => d.toISOString().split('T')[0];

const getWeekStart = (anchor: Date) => {
  const d = new Date(anchor);
  const day = d.getDay(); // 0 = Sun
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); // Mon as start
  d.setHours(0, 0, 0, 0);
  return d;
};

const getWeekDays = (weekStart: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

const taskDateYMD = (task: PlannerTask) => task.date.split('T')[0];

const calcPercent = (p: number, t: number) => Math.min(Math.round((p / (t || 1)) * 100), 100);

// ── Constants ──────────────────────────────────────────────────
const AUTO_SAVE_MS = 15_000;
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const SUBJECTS = Object.keys(SUBJECT_COLORS);

// ── Add Task Modal ─────────────────────────────────────────────
interface AddModalProps {
  date: Date;
  weeklyGoals: PlannerTask[];
  onClose: () => void;
  onAdd: (task: Omit<PlannerTask, '_id' | 'progressPercent' | '_optimistic'>) => void;
}

const AddModal = ({ date, weeklyGoals, onClose, onAdd }: AddModalProps) => {
  const [title,    setTitle]    = useState('');
  const [subject,  setSubject]  = useState('General');
  const [target,   setTarget]   = useState('1');
  const [type,     setType]     = useState<'daily' | 'weekly'>('daily');
  const [parentId, setParentId] = useState<string>('');

  const submit = () => {
    if (!title.trim()) { toast.error('Add a title'); return; }
    const t = Number(target);
    if (!t || t <= 0) { toast.error('Target must be > 0'); return; }
    onAdd({
      title: title.trim(), subject, target: t,
      progress: 0, type,
      date: date.toISOString(), completed: false,
      parentId: (type === 'daily' && parentId) ? parentId : null,
    });
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="bg-[#111] border border-[#E50914]/40 rounded-sm p-6 w-full max-w-md shadow-[0_0_40px_rgba(229,9,20,0.15)]"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-5">
          <h4 className="font-bold font-mono uppercase tracking-widest text-white text-sm">
            Add {type === 'daily' ? 'Task' : 'Goal'} — {DAY_LABELS[date.getDay()]} {date.getDate()} {MONTH_LABELS[date.getMonth()]}
          </h4>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Type Toggle */}
          <div className="flex gap-1 bg-black p-1 rounded-sm border border-gray-800">
            {(['daily', 'weekly'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-1 text-[10px] font-mono uppercase tracking-widest transition-all rounded-sm ${type === t ? 'bg-[#E50914] text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Title</label>
            <input
              autoFocus
              value={title} onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder={type === 'daily' ? "e.g. Solve 2 problems" : "e.g. Solve 15 Trees problems"}
              className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Subject</label>
              <select
                value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Target</label>
              <input
                type="number" min={1} value={target}
                onChange={e => setTarget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
              />
            </div>
          </div>

          {type === 'daily' && weeklyGoals.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
              <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Link to Weekly Goal</label>
              <select
                value={parentId} onChange={e => setParentId(e.target.value)}
                className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
              >
                <option value="">None (Individual Task)</option>
                {weeklyGoals.map(g => (
                  <option key={g._id} value={g._id}>{g.title} ({g.progress}/{g.target})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mt-1">
            {SUBJECTS.map(s => {
              const c = getSubjectColor(s);
              return (
                <button key={s} onClick={() => setSubject(s)}
                  className={`py-1.5 px-2 text-xs font-mono border rounded-sm transition-all ${subject === s ? `${c.border} ${c.bg} ${c.text}` : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          <button
            onClick={submit}
            className="mt-2 flex items-center justify-center gap-2 py-2.5 bg-[#E50914]/10 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white active:scale-[0.98] transition-all font-mono uppercase tracking-widest text-sm rounded-sm"
          >
            <Plus size={16} /> Add {type === 'daily' ? 'Task' : 'Goal'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Task Card ──────────────────────────────────────────────────
interface TaskCardProps {
  task: PlannerTask;
  onProgressChange: (id: string, delta: number) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

const TaskCard = ({ task, onProgressChange, onToggle, onDelete }: TaskCardProps) => {
  const c = getSubjectColor(task.subject);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: task._optimistic ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`border-l-2 ${c.border} bg-[#0d0d0d] rounded-sm px-2.5 py-2 group transition-all hover:bg-[#151515]`}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold font-mono uppercase tracking-wide truncate ${task.completed ? 'line-through text-gray-600' : 'text-gray-200'}`}>
            <span className={`inline-block mr-1.5 px-0.5 rounded-sm bg-black border border-gray-800 text-[9px] ${task.type === 'monthly' ? 'text-purple-400' : task.type === 'weekly' ? 'text-[#E50914]' : 'text-cyan-400'}`}>
              [{task.type === 'monthly' ? 'M' : task.type === 'weekly' ? 'W' : 'D'}]
            </span>
            {task.title}
          </p>
          <span className={`text-[10px] font-mono ${c.text}`}>{task.subject}</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onToggle(task._id)} disabled={!!task._optimistic}
            className={`w-5 h-5 flex items-center justify-center rounded-sm border transition-all ${task.completed ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-gray-600 text-gray-500 hover:border-green-500 hover:text-green-500'}`}
          ><Check size={10} /></button>
          <button onClick={() => onDelete(task._id)} disabled={!!task._optimistic}
            className="w-5 h-5 flex items-center justify-center rounded-sm border border-gray-600 text-gray-500 hover:border-red-500 hover:text-red-500 transition-all"
          ><Trash2 size={10} /></button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-black h-1 rounded-full overflow-hidden border border-gray-800">
          <div className={`h-full ${c.bar} transition-all duration-500`} style={{ width: `${task.progressPercent}%` }} />
        </div>
        <span className="text-[10px] font-mono text-gray-500 w-7 text-right">{task.progressPercent}%</span>
        <div className="flex gap-0.5">
          <button onClick={() => onProgressChange(task._id, -1)} disabled={!!task._optimistic || task.progress <= 0}
            className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-30 transition-colors text-xs"
          >−</button>
          <button onClick={() => onProgressChange(task._id, 1)} disabled={!!task._optimistic}
            className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-green-400 disabled:opacity-30 transition-colors text-xs"
          >+</button>
        </div>
      </div>
    </motion.div>
  );
};

// ── Day Column ─────────────────────────────────────────────────
interface DayColumnProps {
  day: Date;
  tasks: PlannerTask[];
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const DayColumn = ({ day, tasks, isToday, isSelected, onClick }: DayColumnProps) => {
  const done = tasks.filter(t => t.completed).length;
  const pct  = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={`flex-shrink-0 w-36 md:w-40 cursor-pointer rounded-sm border transition-all ${
        isSelected ? 'border-[#E50914] shadow-[0_0_12px_rgba(229,9,20,0.3)]' :
        isToday    ? 'border-[#E50914]/40 bg-[#E50914]/5' : 'border-gray-800 hover:border-gray-600'
      } bg-[#111] p-3 flex flex-col gap-2`}
    >
      {/* Day label */}
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-xs font-mono uppercase tracking-widest ${isToday ? 'text-[#E50914]' : 'text-gray-500'}`}>
            {DAY_LABELS[day.getDay()]}
          </p>
          <p className={`text-xl font-bold font-mono ${isToday ? 'text-[#E50914]' : isSelected ? 'text-white' : 'text-gray-300'}`}>
            {day.getDate()}
          </p>
        </div>
        {tasks.length > 0 && (
          <span className="text-[10px] font-mono text-gray-500 mt-1">{done}/{tasks.length}</span>
        )}
      </div>

      {/* Mini progress */}
      {tasks.length > 0 && (
        <div className="w-full bg-black h-1 rounded-full overflow-hidden border border-gray-800">
          <div
            className={`h-full transition-all duration-700 ${pct === 100 ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]' : 'bg-[#E50914] shadow-[0_0_5px_rgba(229,9,20,0.5)]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Task previews */}
      <div className="flex flex-col gap-1 mt-1 min-h-[40px]">
        {tasks.slice(0, 3).map(t => {
          const c = getSubjectColor(t.subject);
          return (
            <div key={t._id} className={`text-[10px] font-mono truncate px-1.5 py-0.5 rounded-sm border-l-2 ${c.border} ${c.bg} ${t.completed ? 'line-through text-gray-600' : c.text}`}>
              {t.title}
            </div>
          );
        })}
        {tasks.length > 3 && (
          <p className="text-[10px] text-gray-600 font-mono">+{tasks.length - 3} more</p>
        )}
        {tasks.length === 0 && (
          <p className="text-[10px] text-gray-700 font-mono tracking-widest">empty</p>
        )}
      </div>
    </div>
  );
};

// ── Weekly Goal Card ──────────────────────────────────────────
const WeeklyGoalCard = ({ task, childrenTasks, onToggle, onDelete }: {
  task: PlannerTask;
  childrenTasks: PlannerTask[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const c = getSubjectColor(task.subject);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#0d0d0d] border border-gray-800 rounded-sm p-4 hover:border-gray-600 transition-all ${expanded ? 'ring-1 ring-[#E50914]/30' : ''}`}
    >
      <div className="flex justify-between items-start gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${c.bg} ${c.text} border ${c.border}`}>{task.subject}</span>
            <span className="text-[10px] font-mono text-gray-500">{task.progress}/{task.target} items</span>
          </div>
          <h4 className={`text-sm font-bold font-mono uppercase tracking-widest text-white ${task.completed ? 'line-through text-gray-500' : ''}`}>
            <span className="inline-block mr-1.5 px-1 py-0.5 rounded-sm bg-black border border-gray-800 text-[10px] text-[#E50914]">
              [W]
            </span>
            {task.title}
          </h4>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onToggle(task._id)} className={`w-6 h-6 flex items-center justify-center border rounded-sm transition-all ${task.completed ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-gray-700 text-gray-500 hover:text-white'}`}>
            <Check size={12} />
          </button>
          <button onClick={() => onDelete(task._id)} className="w-6 h-6 flex items-center justify-center border border-gray-700 text-gray-500 hover:text-red-500 transition-all">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="relative h-2 bg-black rounded-full overflow-hidden mb-3 border border-gray-900">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${task.progressPercent}%` }}
          className={`absolute inset-y-0 left-0 ${c.bar} shadow-[0_0_10px_rgba(229,9,20,0.3)] transition-all duration-1000`}
        />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{task.progressPercent}% Completed</span>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] font-mono text-[#E50914] hover:underline underline-offset-4 uppercase tracking-widest flex items-center gap-1"
        >
          {expanded ? 'Hide Breakdown' : `Show Breakdown (${childrenTasks.length})`}
          {expanded ? <ChevronLeft size={10} className="rotate-90" /> : <ChevronRight size={10} className="rotate-90" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 flex flex-col gap-2 border-t border-gray-900 mt-3">
              {childrenTasks.length === 0 ? (
                <p className="text-[10px] font-mono text-gray-600 text-center py-2">No linked daily tasks yet</p>
              ) : (
                childrenTasks.map(ct => (
                  <div key={ct._id} className="flex items-center justify-between bg-black/40 p-2 rounded-sm border border-gray-900">
                    <div className="flex items-center gap-2">
                       <span className="inline-block px-1 rounded-sm bg-black border border-gray-800 text-[8px] text-cyan-400 font-bold">[D]</span>
                       <div className={`w-1 h-3 ${c.bar}`} />
                       <span className={`text-[11px] font-mono text-gray-400 ${ct.completed ? 'line-through' : ''}`}>{ct.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-600">
                      {new Date(ct.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Main PlannerView ───────────────────────────────────────────
const PlannerView = ({ dailyStreak = 0 }: { dailyStreak?: number }) => {
  const socket = useSocket();
  const today  = new Date();
  today.setHours(0, 0, 0, 0);

  const [searchParams] = useSearchParams();
  const [viewMode,     setViewMode]     = useState<'daily' | 'weekly'>('daily');
  const [selectedDay,  setSelectedDay]  = useState<Date>(() => {
    const d = searchParams.get('date');
    if (d) {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day, 0, 0, 0, 0);
    }
    return today;
  });
  
  const [weekStart,    setWeekStart]    = useState(() => getWeekStart(selectedDay));
  const [tasks,        setTasks]        = useState<PlannerTask[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const dirtyRef    = useRef<Record<string, Partial<PlannerTask>>>({});
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const weekDays  = getWeekDays(weekStart);
  const weekLabel = `${weekDays[0].getDate()} ${MONTH_LABELS[weekDays[0].getMonth()]} – ${weekDays[6].getDate()} ${MONTH_LABELS[weekDays[6].getMonth()]}`;

  const weeklyGoals = tasks.filter(t => t.type === 'weekly');
  const dailyTasks  = tasks.filter(t => t.type === 'daily' || t.type === 'monthly');
  
  // Tasks for selected day (Daily View)
  const dayTasks   = dailyTasks.filter(t => taskDateYMD(t) === toYMD(selectedDay));
  
  // Completion metrics
  const doneCount = tasks.filter(t => t.completed).length;
  const progressPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  // ── Fetch week ───────────────────────────────────────────────
  const fetchWeek = useCallback(async (ws: Date) => {
    setLoading(true);
    try {
      const { data } = await api.get<PlannerTask[]>(`/planner?week=${toYMD(ws)}`);
      setTasks(data.map(t => ({ ...t, progressPercent: calcPercent(t.progress, t.target) })));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load planner');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeek(weekStart); }, [weekStart, fetchWeek]);

  // ── Socket sync ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (updated: PlannerTask) => {
      setTasks(prev =>
        prev.some(t => t._id === updated._id)
          ? prev.map(t => t._id === updated._id ? { ...updated, progressPercent: calcPercent(updated.progress, updated.target) } : t)
          : prev
      );
    };
    socket.on('planner:sync', handler);
    return () => { socket.off('planner:sync', handler); };
  }, [socket]);

  // ── Auto-save dirty items ────────────────────────────────────
  const flushDirty = useCallback(async () => {
    const dirty = { ...dirtyRef.current };
    if (Object.keys(dirty).length === 0) return;
    dirtyRef.current = {};

    for (const [id, patch] of Object.entries(dirty)) {
      try {
        const { data } = await api.put(`/planner/${id}`, patch);
        setTasks(prev => prev.map(t => t._id === id
          ? { ...data, progressPercent: calcPercent(data.progress, data.target) } : t
        ));
      } catch {
        dirtyRef.current[id] = patch; // retry next cycle
      }
    }
  }, []);

  useEffect(() => {
    autoSaveRef.current = setInterval(flushDirty, AUTO_SAVE_MS);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      flushDirty();
    };
  }, [flushDirty]);

  // ── Progress change ──────────────────────────────────────────
  const changeProgress = (id: string, delta: number) => {
    setTasks(prev => prev.map(t => {
      if (t._id !== id || t._optimistic) return t;
      const next = Math.max(0, t.progress + delta);
      const pct  = calcPercent(next, t.target);
      dirtyRef.current[id] = { ...dirtyRef.current[id], progress: next };
      return { ...t, progress: next, progressPercent: pct };
    }));
  };

  // ── Toggle complete ──────────────────────────────────────────
  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t._id !== id || t._optimistic) return t;
      const nextCompleted = !t.completed;
      dirtyRef.current[id] = { ...dirtyRef.current[id], completed: nextCompleted };
      return { ...t, completed: nextCompleted };
    }));
  };

  // ── Delete ───────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setTasks(prev => prev.filter(t => t._id !== id));
    delete dirtyRef.current[id];
    try { await api.delete(`/planner/${id}`); }
    catch { toast.error('Delete failed'); fetchWeek(weekStart); }
  };

  // ── Add task — optimistic ────────────────────────────────────
  const handleAdd = async (raw: Omit<PlannerTask, '_id' | 'progressPercent' | '_optimistic'>) => {
    const tempId = `tmp_${Date.now()}`;
    const optimistic: PlannerTask = { ...raw, _id: tempId, progressPercent: 0, _optimistic: true };
    setTasks(prev => [...prev, optimistic]);

    try {
      const { data } = await api.post('/planner', { ...raw, timezone: TIMEZONE });
      const confirmed = { ...data, progressPercent: calcPercent(data.progress, data.target) };
      setTasks(prev => prev.map(t => t._id === tempId ? confirmed : t));
      socket?.emit('planner:update', confirmed);
      toast.success(`${raw.type === 'weekly' ? 'Goal' : 'Task'} added`, { style: { border: '1px solid #E50914', background: '#0B0C10', color: '#fff' } });
    } catch (err: any) {
      setTasks(prev => prev.filter(t => t._id !== tempId));
      toast.error(err?.response?.data?.message || 'Failed to add item');
    }
  };

  // ── Week navigation ──────────────────────────────────────────
  const prevWeek = () => { const ws = new Date(weekStart); ws.setDate(ws.getDate() - 7); setWeekStart(ws); };
  const nextWeek = () => { const ws = new Date(weekStart); ws.setDate(ws.getDate() + 7); setWeekStart(ws); };
  const goToday  = () => { setWeekStart(getWeekStart(today)); setSelectedDay(today); };

  return (
    <div className="flex flex-col gap-6 w-full p-2 max-w-4xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#050505] p-5 border border-gray-900 rounded-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#E50914]/10 border border-[#E50914]/40 flex items-center justify-center rounded-sm">
            <Calendar size={22} className="text-[#E50914] drop-shadow-[0_0_8px_rgba(229,9,20,0.5)]" />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase tracking-[0.2em] text-white">System Planner</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono text-gray-500 uppercase">Operational Status</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            </div>
          </div>
        </div>

        {/* Improved Toggle Switch */}
        <div className="flex bg-black p-1 rounded-sm border border-gray-800 self-stretch sm:self-auto">
          {(['daily', 'weekly'] as const).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`flex items-center gap-2 px-5 py-2 rounded-sm text-xs font-mono uppercase tracking-widest transition-all duration-300 ${viewMode === m ? 'bg-[#E50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.3)]' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {m === 'daily' ? <Clock size={14} /> : <LayoutGrid size={14} />}
              {m === 'daily' ? 'Execution' : 'Strategy'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sub-Header Metrics ───────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0d0d0d] border border-gray-900 p-3 rounded-sm">
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Weekly Efficiency</p>
          <p className="text-xl font-bold font-mono text-white">{progressPct}%</p>
        </div>
        <div className="bg-[#0d0d0d] border border-gray-900 p-3 rounded-sm">
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Goals Completed</p>
          <p className="text-xl font-bold font-mono text-white">{weeklyGoals.filter(g => g.completed).length}/{weeklyGoals.length}</p>
        </div>
        <div className="bg-[#0d0d0d] border border-gray-900 p-3 rounded-sm">
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Daily Streak</p>
          <p className="text-xl font-bold font-mono text-[#E50914] flex items-center gap-2">
            {dailyStreak} 
            <span className="text-[10px] text-gray-600 uppercase">Days</span>
            {dailyStreak > 0 && <Zap size={14} className="text-yellow-500 fill-yellow-500 animate-bounce" />}
          </p>
        </div>
        <div className="bg-[#0d0d0d] border border-gray-900 p-3 rounded-sm">
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1">Active Week</p>
          <p className="text-[11px] font-bold font-mono text-gray-400 mt-2 uppercase">{weekLabel}</p>
        </div>
      </div>

      {/* ── View Content ────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {viewMode === 'weekly' ? (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col gap-4"
          >
             <div className="flex justify-between items-center bg-[#050505] p-4 border border-gray-900 rounded-sm">
                <div className="flex items-center gap-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#E50914]">High-Level Weekly Targets</h4>
                  <div className="flex items-center gap-1">
                    <button onClick={prevWeek} className="p-1 hover:text-[#E50914] transition-colors"><ChevronLeft size={14} /></button>
                    <span className="text-[10px] font-mono text-gray-500">{weekLabel}</span>
                    <button onClick={nextWeek} className="p-1 hover:text-[#E50914] transition-colors"><ChevronRight size={14} /></button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={goToday} className="px-3 py-1 text-[10px] font-mono text-gray-400 hover:text-white border border-gray-800 rounded-sm">Today</button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-[#E50914]/10 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white transition-all font-mono uppercase tracking-[0.2em] text-[10px] rounded-sm"
                  >
                    New Strategy
                  </button>
                </div>
             </div>
             
             {weeklyGoals.length === 0 ? (
               <div className="text-center py-20 bg-[#0d0d0d] border-2 border-dashed border-gray-900 rounded-sm">
                  <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">No strategies defined for this week</p>
               </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {weeklyGoals.map(goal => (
                    <WeeklyGoalCard
                      key={goal._id}
                      task={goal}
                      childrenTasks={dailyTasks.filter(dt => dt.parentId === goal._id)}
                      onToggle={toggleTask}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
             )}

             {/* ── Monthly Strategy ── */}
             <div className="mt-2 flex flex-col gap-3">
               <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-[#E50914]">Monthly Strategy</h4>
               <div className="bg-[#0d0d0d] border border-gray-900 rounded-sm p-5 hover:border-gray-800 transition-all flex flex-col gap-4">
                 
                 <div className="flex justify-between items-start">
                   <div className="flex-1">
                     <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1.5 flex justify-between items-center">
                       <span>Primary Focus</span>
                       <button className="text-gray-600 hover:text-white transition-colors" title="Edit Monthly Goal">
                         <Edit2 size={12} />
                       </button>
                     </p>
                     <p className="text-base font-bold font-mono text-white tracking-wide">Complete 200 DSA Problems</p>
                   </div>
                 </div>

                 {/* Progress Bar */}
                 <div className="flex items-center gap-3">
                   <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden border border-gray-900">
                     <div className="h-full bg-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.3)] w-[35%]" />
                   </div>
                   <span className="text-[10px] font-mono text-gray-500">35%</span>
                 </div>

                 {/* Focus Areas */}
                 <div className="mt-1">
                   <div className="flex gap-2 flex-wrap">
                     {["DSA", "React Projects", "Backend APIs", "Gym"].map(area => (
                       <span key={area} className="text-[10px] font-mono px-2 py-0.5 rounded-sm bg-[#151515] border border-gray-800 text-gray-400">
                         {area}
                       </span>
                     ))}
                   </div>
                 </div>

                 {/* Motivation / Quote */}
                 <div className="pt-3 border-t border-gray-900 mt-1">
                   <p className="text-[11px] font-mono text-gray-500 italic text-center">"Small progress daily leads to big results."</p>
                 </div>
                 
               </div>
             </div>
          </motion.div>
        ) : (
          <motion.div
            key="daily"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col gap-4"
          >
            {/* 7-Day Mini Calendar with Nav */}
            <div className="flex items-center justify-between mb-1">
               <div className="flex items-center gap-2">
                 <button onClick={prevWeek} className="p-1.5 border border-gray-800 rounded-sm text-gray-500 hover:text-white"><ChevronLeft size={16} /></button>
                 <span className="text-[11px] font-mono text-gray-500 uppercase tracking-widest">{weekLabel}</span>
                 <button onClick={nextWeek} className="p-1.5 border border-gray-800 rounded-sm text-gray-500 hover:text-white"><ChevronRight size={16} /></button>
               </div>
               <button onClick={goToday} className="text-[10px] font-mono text-[#E50914] border border-[#E50914]/20 px-2 py-1 rounded-sm hover:bg-[#E50914]/10 transition-all">Back to Today</button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {weekDays.map(day => (
                <DayColumn
                  key={toYMD(day)}
                  day={day}
                  tasks={dailyTasks.filter(t => taskDateYMD(t) === toYMD(day))}
                  isToday={toYMD(day) === toYMD(today)}
                  isSelected={toYMD(day) === toYMD(selectedDay)}
                  onClick={() => setSelectedDay(new Date(day))}
                />
              ))}
            </div>

            {/* Execution List */}
            <div className="bg-[#050505] border border-gray-900 rounded-sm overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-gray-900 bg-[#080808]">
                <div>
                   <h4 className="font-bold font-mono uppercase tracking-widest text-white text-sm">
                    Execution Mode — {selectedDay.getDate()} {MONTH_LABELS[selectedDay.getMonth()]}
                   </h4>
                   <p className="text-[10px] font-mono text-gray-600 mt-1">{dayTasks.length} Operations Pending</p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] text-white hover:bg-red-700 transition-all font-mono uppercase tracking-widest text-[10px] rounded-sm font-bold active:scale-95"
                >
                  <Plus size={14} /> Add Task
                </button>
              </div>

              <div className="p-4 flex flex-col gap-3 min-h-[300px]">
                {loading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : dayTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-30">
                    <Clock size={40} className="mb-4 text-gray-600" />
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-[0.3em]">No tasks indexed for this sector</p>
                  </div>
                ) : (
                  dayTasks.map(task => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      onProgressChange={changeProgress}
                      onToggle={toggleTask}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <AddModal
            date={selectedDay}
            weeklyGoals={weeklyGoals}
            onClose={() => setShowAddModal(false)}
            onAdd={handleAdd}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
// ── Planner Type Picker ────────────────────────────────────────
type PlannerMode = 'picker' | 'daily' | 'weekly' | 'monthly';

const PLANNER_OPTIONS = [
  {
    id: 'daily' as PlannerMode,
    label: 'Daily Planner',
    desc: 'Tasks for today',
    icon: Clock,
    color: 'border-cyan-500 text-cyan-400 hover:bg-cyan-500/10',
    glow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]',
  },
  {
    id: 'weekly' as PlannerMode,
    label: 'Weekly Planner',
    desc: '7-day calendar view',
    icon: Calendar,
    color: 'border-[#E50914] text-[#E50914] hover:bg-[#E50914]/10',
    glow: 'hover:shadow-[0_0_20px_rgba(229,9,20,0.2)]',
  },
  {
    id: 'monthly' as PlannerMode,
    label: 'Monthly Planner',
    desc: 'Full month calendar',
    icon: LayoutGrid,
    color: 'border-purple-500 text-purple-400 hover:bg-purple-500/10',
    glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
  },
];

const PlannerPicker = ({ onSelect }: { onSelect: (m: PlannerMode) => void }) => (
  <div className="flex flex-col gap-6 w-full p-2">
    <div className="flex items-center gap-3 border-b-2 border-gray-900 pb-4">
      <Calendar size={20} className="text-[#E50914] drop-shadow-[0_0_5px_#E50914] animate-pulse" />
      <h3 className="text-xl font-bold uppercase tracking-widest text-white">Planner</h3>
    </div>
    <p className="text-xs text-gray-500 font-mono tracking-widest uppercase -mt-2">Select a planning mode</p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {PLANNER_OPTIONS.map(opt => {
        const Icon = opt.icon;
        return (
          <motion.button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex flex-col items-center justify-center gap-3 p-8 bg-[#111] border-2 rounded-sm transition-all cursor-pointer ${opt.color} ${opt.glow}`}
          >
            <Icon size={32} />
            <div className="text-center">
              <p className="font-bold font-mono uppercase tracking-widest text-white text-sm">{opt.label}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">{opt.desc}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  </div>
);

// ── Outer wrapper — picker + views ──────────────────────────────
const PlannerWrapper = ({ dailyStreak = 0 }: { dailyStreak?: number }) => {
  const location = useLocation();
  const [mode, setMode] = useState<PlannerMode>(() => {
    return location.pathname === '/daily' ? 'daily' : 'picker';
  });

  return (
    <AnimatePresence mode="wait">
      {mode === 'picker' ? (
        <motion.div key="picker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <PlannerPicker onSelect={setMode} />
        </motion.div>
      ) : mode === 'monthly' ? (
        <motion.div key="monthly" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <div className="flex items-center gap-2 mb-2 pl-2">
            <button onClick={() => setMode('picker')} className="text-xs text-gray-500 hover:text-white font-mono tracking-widest uppercase border border-gray-700 hover:border-gray-500 px-2 py-1 rounded-sm transition-all">← Back</button>
          </div>
          <MonthlyPlannerView />
        </motion.div>
      ) : (
        <motion.div key="weekly" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <div className="flex items-center gap-2 mb-2 pl-2">
            <button onClick={() => setMode('picker')} className="text-xs text-gray-500 hover:text-white font-mono tracking-widest uppercase border border-gray-700 hover:border-gray-500 px-2 py-1 rounded-sm transition-all">← Back</button>
            {mode === 'daily' && <span className="text-xs text-cyan-400 font-mono tracking-widest uppercase">Today's Tasks ↓</span>}
          </div>
          <PlannerView dailyStreak={dailyStreak} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlannerWrapper;
