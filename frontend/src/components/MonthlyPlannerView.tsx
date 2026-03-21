import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, Check, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';

// ─── Types ────────────────────────────────────────────────────────────
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
  _optimistic?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────
const DAY_LABELS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTH  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const AUTO_SAVE_MS = 15_000;
const TIMEZONE     = Intl.DateTimeFormat().resolvedOptions().timeZone;

const SUBJECT_COLORS: Record<string, { border: string; bg: string; text: string; bar: string }> = {
  DSA:     { border: 'border-blue-500',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   bar: 'bg-blue-500'   },
  React:   { border: 'border-cyan-500',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   bar: 'bg-cyan-500'   },
  Gym:     { border: 'border-green-500',  bg: 'bg-green-500/10',  text: 'text-green-400',  bar: 'bg-green-500'  },
  College: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', bar: 'bg-yellow-500' },
  Study:   { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400', bar: 'bg-orange-500' },
  General: { border: 'border-[#E50914]',  bg: 'bg-[#E50914]/10',  text: 'text-[#E50914]',  bar: 'bg-[#E50914]' },
};
const SUBJECTS = Object.keys(SUBJECT_COLORS);
const getSubjectColor = (s: string) =>
  SUBJECT_COLORS[s] ?? { border: 'border-gray-600', bg: 'bg-gray-600/10', text: 'text-gray-400', bar: 'bg-gray-500' };

// ─── Helpers ──────────────────────────────────────────────────────────
const toYMD = (d: Date) => d.toISOString().split('T')[0];
const calcPercent = (p: number, t: number) => Math.min(Math.round((p / (t || 1)) * 100), 100);
const taskDateYMD = (task: PlannerTask) => task.date.split('T')[0];
const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const getFirstDow = (y: number, m: number) => new Date(y, m, 1).getDay();

// ─── Inline Add Modal ─────────────────────────────────────────────────
interface AddModalProps {
  date: Date;
  onClose: () => void;
  onAdd: (task: Omit<PlannerTask, '_id' | 'progressPercent' | '_optimistic'>) => void;
}
const AddModal = ({ date, onClose, onAdd }: AddModalProps) => {
  const [title,   setTitle]   = useState('');
  const [subject, setSubject] = useState('General');
  const [target,  setTarget]  = useState('1');

  const submit = () => {
    if (!title.trim()) { toast.error('Add a title'); return; }
    const t = Number(target);
    if (!t || t <= 0) { toast.error('Target must be > 0'); return; }
    onAdd({ title: title.trim(), subject, target: t, progress: 0, type: 'daily', date: date.toISOString(), completed: false });
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
            Add Task — {DAY_LABELS[date.getDay()]} {date.getDate()} {SHORT_MONTH[date.getMonth()]}
          </h4>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Title</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="e.g. Solve 5 LeetCode problems"
              className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Subject</label>
              <select value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
              >
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Target</label>
              <input type="number" min={1} value={target} onChange={e => setTarget(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {SUBJECTS.map(s => {
              const c = getSubjectColor(s);
              return (
                <button key={s} onClick={() => setSubject(s)}
                  className={`py-1.5 px-2 text-xs font-mono border rounded-sm transition-all ${subject === s ? `${c.border} ${c.bg} ${c.text}` : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                >{s}</button>
              );
            })}
          </div>
          <button onClick={submit} className="mt-2 flex items-center justify-center gap-2 py-2.5 bg-[#E50914]/10 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white active:scale-[0.98] transition-all font-mono uppercase tracking-widest text-sm rounded-sm">
            <Plus size={16} /> Add Task
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Inline Task Card ─────────────────────────────────────────────────
interface TaskCardProps {
  task: PlannerTask;
  onProgressChange: (id: string, delta: number) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}
const TaskCard = ({ task, onProgressChange, onToggle, onDelete }: TaskCardProps) => {
  const c = getSubjectColor(task.subject);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: task._optimistic ? 0.6 : 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`border-l-2 ${c.border} bg-[#0d0d0d] rounded-sm px-2.5 py-2 group transition-all hover:bg-[#151515]`}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold font-mono uppercase tracking-wide truncate ${task.completed ? 'line-through text-gray-600' : 'text-gray-200'}`}>{task.title}</p>
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
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-black h-1 rounded-full overflow-hidden border border-gray-800">
          <div className={`h-full ${c.bar} transition-all duration-500`} style={{ width: `${task.progressPercent}%` }} />
        </div>
        <span className="text-[10px] font-mono text-gray-500 w-7 text-right">{task.progressPercent}%</span>
        <div className="flex gap-0.5">
          <button onClick={() => onProgressChange(task._id, -1)} disabled={!!task._optimistic || task.progress <= 0}
            className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-30 transition-colors text-xs">−</button>
          <button onClick={() => onProgressChange(task._id, 1)} disabled={!!task._optimistic}
            className="w-4 h-4 flex items-center justify-center text-gray-600 hover:text-green-400 disabled:opacity-30 transition-colors text-xs">+</button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Day Cell ─────────────────────────────────────────────────────────
interface DayCellProps { date: Date | null; tasks: PlannerTask[]; isToday: boolean; isSelected: boolean; onClick: () => void; }
const DayCell = ({ date, tasks, isToday, isSelected, onClick }: DayCellProps) => {
  if (!date) return <div className="min-h-[72px]" />;
  const done = tasks.filter(t => t.completed).length;
  const pct  = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  return (
    <div onClick={onClick} className={`min-h-[72px] p-2 rounded-sm border cursor-pointer transition-all flex flex-col gap-1 ${
      isSelected ? 'border-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.3)] bg-[#E50914]/5' :
      isToday    ? 'border-[#E50914]/40 bg-[#E50914]/5' :
                   'border-gray-800 bg-[#111] hover:border-gray-600'}`}
    >
      <span className={`text-sm font-bold font-mono ${isToday ? 'text-[#E50914]' : isSelected ? 'text-white' : 'text-gray-400'}`}>{date.getDate()}</span>
      {tasks.length > 0 && (
        <div className="w-full bg-black h-0.5 rounded-full overflow-hidden">
          <div className={`h-full ${pct === 100 ? 'bg-green-500' : 'bg-[#E50914]'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="flex gap-0.5 flex-wrap">
        {tasks.slice(0, 4).map(t => {
          const c = getSubjectColor(t.subject);
          return <span key={t._id} className={`w-1.5 h-1.5 rounded-full inline-block ${c.bar} ${t.completed ? 'opacity-30' : 'opacity-80'}`} />;
        })}
        {tasks.length > 4 && <span className="text-[8px] text-gray-600 font-mono">+{tasks.length - 4}</span>}
      </div>
      {tasks.length > 0 && <span className="text-[9px] text-gray-600 font-mono">{done}/{tasks.length}</span>}
    </div>
  );
};

// ─── Main MonthlyPlannerView ──────────────────────────────────────────
const MonthlyPlannerView = () => {
  const socket = useSocket();
  const now = new Date();

  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth());
  const [tasks,       setTasks]       = useState<PlannerTask[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [showAdd,     setShowAdd]     = useState(false);

  const dirtyRef    = useRef<Record<string, Partial<PlannerTask>>>({});
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const toYMDStr = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const { data } = await api.get<PlannerTask[]>(`/planner?month=${toYMDStr(y, m)}`);
      setTasks(data.map(t => ({ ...t, progressPercent: calcPercent(t.progress, t.target) })));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load monthly planner');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMonth(year, month); }, [year, month, fetchMonth]);

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

  const flushDirty = useCallback(async () => {
    const dirty = { ...dirtyRef.current };
    if (!Object.keys(dirty).length) return;
    dirtyRef.current = {};
    for (const [id, patch] of Object.entries(dirty)) {
      try {
        const { data } = await api.put(`/planner/${id}`, patch);
        setTasks(prev => prev.map(t => t._id === id ? { ...data, progressPercent: calcPercent(data.progress, data.target) } : t));
      } catch { dirtyRef.current[id] = patch; }
    }
  }, []);

  useEffect(() => {
    autoSaveRef.current = setInterval(flushDirty, AUTO_SAVE_MS);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); flushDirty(); };
  }, [flushDirty]);

  const changeProgress = (id: string, delta: number) => {
    setTasks(prev => prev.map(t => {
      if (t._id !== id || t._optimistic) return t;
      const next = Math.max(0, t.progress + delta);
      dirtyRef.current[id] = { ...dirtyRef.current[id], progress: next };
      return { ...t, progress: next, progressPercent: calcPercent(next, t.target) };
    }));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t._id !== id || t._optimistic) return t;
      const nc = !t.completed;
      dirtyRef.current[id] = { ...dirtyRef.current[id], completed: nc };
      return { ...t, completed: nc };
    }));
  };

  const handleDelete = async (id: string) => {
    setTasks(prev => prev.filter(t => t._id !== id));
    delete dirtyRef.current[id];
    try { await api.delete(`/planner/${id}`); }
    catch { toast.error('Delete failed'); fetchMonth(year, month); }
  };

  const handleAdd = async (raw: Omit<PlannerTask, '_id' | 'progressPercent' | '_optimistic'>) => {
    const tempId = `tmp_${Date.now()}`;
    const optimistic: PlannerTask = { ...raw, _id: tempId, progressPercent: 0, _optimistic: true };
    setTasks(prev => [...prev, optimistic]);
    try {
      const { data } = await api.post('/planner', { ...raw, timezone: TIMEZONE });
      const confirmed = { ...data, progressPercent: calcPercent(data.progress, data.target) };
      setTasks(prev => prev.map(t => t._id === tempId ? confirmed : t));
      socket?.emit('planner:update', confirmed);
      toast.success('Task added', { style: { border: '1px solid #E50914', background: '#0B0C10', color: '#fff' } });
    } catch (err: any) {
      setTasks(prev => prev.filter(t => t._id !== tempId));
      toast.error(err?.response?.data?.message || 'Failed to add task');
    }
  };

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow    = getFirstDow(year, month);
  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(Date.UTC(year, month, i + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dayTasks  = selectedDay ? tasks.filter(t => taskDateYMD(t) === toYMD(selectedDay)) : [];
  const monthDone = tasks.filter(t => t.completed).length;
  const monthPct  = tasks.length ? Math.round((monthDone / tasks.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-5 w-full p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b-2 border-gray-900 pb-4">
        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-[#E50914] drop-shadow-[0_0_5px_#E50914] animate-pulse" />
          <h3 className="text-xl font-bold uppercase tracking-widest text-white">Monthly Planner</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0d0d0d] border border-gray-800 px-4 py-1.5 rounded-sm">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Month</span>
            <span className={`text-sm font-bold font-mono ${monthPct === 100 ? 'text-green-400' : 'text-[#E50914]'}`}>{monthPct}%</span>
            <span className="text-xs text-gray-600 font-mono">{monthDone}/{tasks.length} done</span>
          </div>
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); setSelectedDay(new Date()); }}
            className="text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-sm transition-all"
          >Today</button>
        </div>
      </div>

      {/* Month Nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 border border-gray-700 rounded-sm text-gray-400 hover:text-white hover:border-gray-500 active:scale-90 transition-all"><ChevronLeft size={18} /></button>
        <span className="text-base font-bold font-mono text-white tracking-widest">{MONTH_LABELS[month]} {year}</span>
        <button onClick={nextMonth} className="p-1.5 border border-gray-700 rounded-sm text-gray-400 hover:text-white hover:border-gray-500 active:scale-90 transition-all"><ChevronRight size={18} /></button>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1.5">
          {[...Array(35)].map((_, i) => <div key={i} className="min-h-[72px] bg-[#111] border border-gray-800 rounded-sm animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5 mb-0.5">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-mono uppercase tracking-widest text-gray-600 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((date, i) => (
              <DayCell
                key={i} date={date}
                tasks={date ? tasks.filter(t => taskDateYMD(t) === toYMD(date)) : []}
                isToday={date ? toYMD(date) === toYMD(today) : false}
                isSelected={date && selectedDay ? toYMD(date) === toYMD(selectedDay) : false}
                onClick={() => date && setSelectedDay(new Date(date))}
              />
            ))}
          </div>
        </>
      )}

      {/* Day Detail */}
      {selectedDay && (
        <div className="mt-1 bg-[#0d0d0d] border border-gray-800 rounded-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="font-bold font-mono uppercase tracking-widest text-white text-sm">
                {DAY_LABELS[selectedDay.getDay()]} {selectedDay.getDate()} {SHORT_MONTH[selectedDay.getMonth()]}
                {toYMD(selectedDay) === toYMD(today) && (
                  <span className="ml-2 text-[#E50914] text-xs border border-[#E50914]/40 px-1.5 py-0.5 rounded-sm">TODAY</span>
                )}
              </h4>
              <p className="text-xs text-gray-500 font-mono mt-0.5">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''} · auto-saves every 15s</p>
            </div>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#E50914]/10 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white active:scale-95 transition-all font-mono uppercase tracking-widest text-xs rounded-sm"
            ><Plus size={14} /> Add Task</button>
          </div>
          <AnimatePresence>
            {dayTasks.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center py-8 text-[#E50914]/40 font-mono text-sm uppercase tracking-widest border-2 border-dashed border-[#E50914]/10 rounded-sm"
              >No tasks — add one above</motion.div>
            ) : (
              <div className="flex flex-col gap-2">
                {dayTasks.map(task => (
                  <TaskCard key={task._id} task={task} onProgressChange={changeProgress} onToggle={toggleTask} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showAdd && selectedDay && (
          <AddModal date={selectedDay} onClose={() => setShowAdd(false)} onAdd={handleAdd} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MonthlyPlannerView;
