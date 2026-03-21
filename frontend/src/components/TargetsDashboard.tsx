import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { Target as TargetIcon, Plus, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ObjectiveData {
  _id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  _optimistic?: boolean; // marks locally added rows
}

const TargetsDashboard = () => {
  const [objectives, setObjectives] = useState<ObjectiveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [adding, setAdding] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchObjectives = async () => {
    try {
      const { data } = await api.get('/objectives');
      // Preserve any still-pending optimistic rows until server confirms
      setObjectives(prev => {
        const pending = prev.filter(o => o._optimistic);
        const confirmed = (data as ObjectiveData[]).map(o => ({ ...o, _optimistic: false }));
        const dedupedPending = pending.filter(p => !confirmed.find(c => c.title === p.title));
        return [...confirmed, ...dedupedPending];
      });
    } catch (err) {
      console.error('fetchObjectives error:', err);
      toast.error('Failed to load objectives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchObjectives(); }, []);

  // ── Add Objective — OPTIMISTIC ─────────────────────────────
  const handleAddObjective = async () => {
    const trimmedTitle = title.trim();
    const parsedTarget = Number(targetValue);

    if (!trimmedTitle) {
      toast.error('Enter an objective title');
      titleRef.current?.focus();
      return;
    }
    if (!parsedTarget || parsedTarget <= 0) {
      toast.error('Enter a valid target number');
      return;
    }

    // 1. Instantly show in UI
    const tempId = `temp_${Date.now()}`;
    const optimisticRow: ObjectiveData = {
      _id: tempId,
      title: trimmedTitle,
      targetValue: parsedTarget,
      currentValue: 0,
      progressPercent: 0,
      _optimistic: true,
    };
    setObjectives(prev => [optimisticRow, ...prev]);
    setTitle('');
    setTargetValue('');
    setAdding(true);

    console.log('[Objective] POST /api/objectives →', { title: trimmedTitle, targetValue: parsedTarget });

    try {
      const { data } = await api.post('/objectives', {
        title: trimmedTitle,
        targetValue: parsedTarget,
      });
      console.log('[Objective] Created:', data);

      // 2. Replace temp row with real data
      setObjectives(prev => prev.map(o => o._id === tempId ? { ...data, _optimistic: false } : o));
      toast.success('Objective created', {
        style: { border: '1px solid #45A29E', background: '#0B0C10', color: '#fff' }
      });
    } catch (err: any) {
      // 3. Rollback on failure
      setObjectives(prev => prev.filter(o => o._id !== tempId));
      const msg = err?.response?.data?.message || err?.message || 'Failed to create objective';
      console.error('[Objective] Create failed:', msg);
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  // ── Progress — OPTIMISTIC ──────────────────────────────────
  const addProgress = async (id: string) => {
    // Immediately update the local count
    setObjectives(prev => prev.map(o => {
      if (o._id !== id) return o;
      const next = o.currentValue + 1;
      return {
        ...o,
        currentValue: next,
        progressPercent: Math.min(Math.round((next / o.targetValue) * 100), 100),
      };
    }));

    try {
      const { data } = await api.put(`/objectives/${id}/progress`, { amount: 1 });
      // Sync with server values (handles any discrepancy)
      setObjectives(prev => prev.map(o => o._id === id ? { ...data, _optimistic: false } : o));
    } catch (err: any) {
      // Rollback: refetch from server
      toast.error('Progress sync failed — refreshing');
      fetchObjectives();
    }
  };

  // ── Enter key on inputs ────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddObjective();
  };

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <h3 className="text-xl font-bold uppercase tracking-widest text-white border-b-2 border-gray-900 pb-3 flex justify-between items-center">
        <span>Strategic Objectives</span>
        <TargetIcon size={20} className="text-[#E50914] drop-shadow-[0_0_5px_#E50914]" />
      </h3>

      {/* ── Input ── */}
      <div className="bg-[#111] border border-gray-800 p-4 rounded-sm flex flex-col md:flex-row gap-3 items-end shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
        <div className="flex-1 w-full">
          <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Objective Title</label>
          <input
            ref={titleRef}
            type="text"
            placeholder="e.g. 10 hours coding"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-[#E50914] focus:shadow-[0_0_8px_rgba(229,9,20,0.3)] transition-all font-mono text-sm"
          />
        </div>
        <div className="w-full md:w-32">
          <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Target</label>
          <input
            type="number"
            value={targetValue}
            placeholder="e.g. 10"
            min={1}
            onChange={e => setTargetValue(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-[#E50914] focus:shadow-[0_0_8px_rgba(229,9,20,0.3)] transition-all font-mono text-sm"
          />
        </div>
        <button
          onClick={handleAddObjective}
          disabled={adding}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-[#E50914]/10 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white active:scale-95 transition-all font-mono uppercase tracking-widest text-sm rounded shadow-[0_0_10px_rgba(229,9,20,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> {adding ? 'Adding…' : 'Add'}
        </button>
      </div>

      {/* ── List ── */}
      <div className="flex flex-col gap-5">
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-[#111] animate-pulse border border-gray-800 rounded-sm" />
          ))
        ) : objectives.length === 0 ? (
          <div className="text-[#E50914]/70 bg-[#E50914]/5 font-mono text-sm tracking-widest uppercase text-center py-8 border-2 border-dashed border-[#E50914]/30 rounded-sm">
            No active overriding objectives.
          </div>
        ) : (
          objectives.map(t => (
            <div
              key={t._id}
              className={`bg-[#111] border p-4 rounded-sm relative overflow-hidden group transition-all ${
                t._optimistic ? 'border-gray-700 opacity-70' : 'border-gray-800 hover:border-gray-500'
              }`}
            >
              <div className="flex justify-between items-center mb-3 relative z-10">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-200 uppercase tracking-widest font-mono">
                    {t.title}
                    {t._optimistic && <span className="ml-2 text-xs text-gray-500 normal-case tracking-normal">saving…</span>}
                  </span>
                  <span className="text-xs text-gray-500 font-mono tracking-widest mt-1">
                    {t.currentValue} / {t.targetValue} &nbsp;·&nbsp; {Math.max(t.targetValue - t.currentValue, 0)} remaining
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => !t._optimistic && addProgress(t._id)}
                    disabled={!!t._optimistic}
                    className="p-1.5 border border-gray-600 rounded text-gray-400 hover:text-green-500 hover:border-green-500 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Add +1 Progress"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <span className="text-sm text-[#E50914] font-mono tracking-widest font-bold">{t.progressPercent}%</span>
                </div>
              </div>
              <div className="w-full bg-black h-2 rounded-full overflow-hidden relative z-10 border border-gray-800">
                <div
                  className="bg-gradient-to-r from-red-900 to-[#E50914] h-full transition-all duration-700 ease-out shadow-[0_0_10px_#E50914]"
                  style={{ width: `${t.progressPercent}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TargetsDashboard;
