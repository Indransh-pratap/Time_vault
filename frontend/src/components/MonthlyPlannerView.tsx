import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, X, Edit2 } from 'lucide-react';
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
  const [title,    setTitle]    = useState('');
  const [subject,  setSubject]  = useState('General');
  const [target,   setTarget]   = useState('1');
  const [taskDate, setTaskDate] = useState(toYMD(date));

  const submit = () => {
    if (!title.trim()) { toast.error('Add a title'); return; }
    const t = Number(target);
    if (!t || t <= 0) { toast.error('Target must be > 0'); return; }
    const d = new Date(taskDate);
    onAdd({ title: title.trim(), subject, target: t, progress: 0, type: 'monthly', date: d.toISOString(), completed: false });
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
          <div>
            <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Date</label>
            <input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)}
              className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded-sm focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm [color-scheme:dark]"
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
  const [showAdd,     setShowAdd]     = useState(false);
  const [addDate,     setAddDate]     = useState<Date>(now);

  const [strategy, setStrategy] = useState({ goal: 'Set a primary goal for this month', focusTags: [] as string[], quote: 'Consistency > Motivation' });
  const [isEditingStrategy, setIsEditingStrategy] = useState(false);
  const [editForm, setEditForm] = useState({ goal: '', tags: '', quote: '' });

  const dirtyRef    = useRef<Record<string, Partial<PlannerTask>>>({});
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const toYMDStr = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    try {
      const ym = toYMDStr(y, m);
      const [plannerRes, stratRes] = await Promise.all([
        api.get<PlannerTask[]>(`/planner?month=${ym}`),
        api.get(`/planner/strategy?month=${ym}`)
      ]);
      setTasks(plannerRes.data.filter(t => t.type === 'monthly').map(t => ({ ...t, progressPercent: calcPercent(t.progress, t.target) })));
      if (stratRes.data) {
         setStrategy({ goal: stratRes.data.goal, focusTags: stratRes.data.focusTags, quote: stratRes.data.quote });
      } else {
         setStrategy({ goal: 'Set a primary goal for this month', focusTags: [], quote: 'Consistency > Motivation' });
      }
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

  const saveStrategy = async () => {
    try {
      const tags = editForm.tags.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4);
      const res = await api.put(`/planner/strategy`, { month: toYMDStr(year, month), goal: editForm.goal, focusTags: tags, quote: editForm.quote });
      setStrategy({ goal: res.data.goal, focusTags: res.data.focusTags, quote: res.data.quote });
      setIsEditingStrategy(false);
      toast.success('Strategy updated');
    } catch (err) {
      toast.error('Failed to update strategy');
    }
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
          <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()); }}
            className="text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-sm transition-all"
          >Today</button>
          <button onClick={() => { setAddDate(new Date()); setShowAdd(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E50914]/10 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white transition-all font-mono uppercase tracking-widest text-xs rounded-sm"
          ><Plus size={14} /> Add</button>
        </div>
      </div>

      {/* ── Monthly Strategy Block ── */}
      <div className="bg-[#050505] border border-gray-900 rounded-sm p-4 flex flex-col gap-3 mt-1 mb-2 relative group">
        {isEditingStrategy ? (
          <div className="flex flex-col gap-3">
            <input value={editForm.goal} onChange={e => setEditForm({ ...editForm, goal: e.target.value })} placeholder="Target (e.g. 200 LeetCode Problems)" className="w-full bg-[#111] border border-gray-800 text-white px-3 py-2 rounded-sm text-sm font-mono focus:border-[#E50914] outline-none" />
            <input value={editForm.tags} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} placeholder="Comma-separated tags (e.g. DSA, Backend, Gym)" className="w-full bg-[#111] border border-gray-800 text-white px-3 py-2 rounded-sm text-sm font-mono focus:border-[#E50914] outline-none" />
            <input value={editForm.quote} onChange={e => setEditForm({ ...editForm, quote: e.target.value })} placeholder="Motivation line" className="w-full bg-[#111] border border-gray-800 text-white px-3 py-2 rounded-sm text-sm font-mono focus:border-[#E50914] outline-none" />
            <div className="flex justify-end gap-2 mt-1">
               <button onClick={() => setIsEditingStrategy(false)} className="px-3 py-1.5 bg-gray-900 text-gray-400 hover:text-white rounded-sm text-xs font-mono">Cancel</button>
               <button onClick={saveStrategy} className="px-3 py-1.5 bg-[#E50914]/20 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white transition-colors rounded-sm text-xs font-mono uppercase tracking-widest">Save</button>
            </div>
          </div>
        ) : (
          <>
            <button onClick={() => { setEditForm({ goal: strategy.goal, tags: strategy.focusTags.join(', '), quote: strategy.quote }); setIsEditingStrategy(true); }} className="absolute top-4 right-4 p-1.5 bg-black/50 border border-gray-800 text-gray-500 hover:text-[#E50914] hover:border-[#E50914] rounded-sm transition-all opacity-0 group-hover:opacity-100">
               <Edit2 size={12} />
            </button>
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-6">
                <h4 className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Monthly Mission</h4>
                <p className="text-sm font-bold font-mono text-white tracking-wide">{strategy.goal}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden border border-gray-900">
                <div className={`h-full ${monthPct === 100 ? 'bg-green-500' : 'bg-[#E50914]'} shadow-[0_0_10px_rgba(229,9,20,0.3)] transition-all duration-500`} style={{ width: `${monthPct}%` }} />
              </div>
              <span className="text-[10px] font-mono text-gray-500">{monthPct}%</span>
            </div>

            <div className="flex gap-2 flex-wrap mt-0.5">
              {strategy.focusTags.length > 0 ? strategy.focusTags.map(area => (
                <span key={area} className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm bg-[#151515] border border-gray-800 text-gray-400">
                  {area}
                </span>
              )) : (
                <span className="text-[9px] font-mono text-gray-600">No focus tags set</span>
              )}
            </div>
            
            <div className="pt-2 border-t border-gray-900 mt-1">
              <p className="text-[10px] font-mono text-gray-600 italic text-center">"{strategy.quote}"</p>
            </div>
          </>
        )}
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
                isSelected={false}
                onClick={() => { if (date) { setAddDate(new Date(date)); setShowAdd(true); } }}
              />
            ))}
          </div>
        </>
      )}

      {/* Empty State */}
      {tasks.length === 0 && !loading && (
         <div className="text-center py-6 text-gray-500 font-mono text-xs uppercase tracking-widest border border-dashed border-gray-800 rounded-sm mt-2">
            No tasks yet — Click any date or <button onClick={() => {setAddDate(now); setShowAdd(true);}} className="text-[#E50914] hover:underline">Add</button> to plan your mission.
         </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <AddModal date={addDate} onClose={() => setShowAdd(false)} onAdd={handleAdd} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MonthlyPlannerView;
