import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const StrategyBoard: React.FC = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    target: '',
    deadline: '',
    priority: 'Medium'
  });

  const fetchGoals = async () => {
    try {
      const { data } = await api.get('/coding/goals');
      setGoals(data);
    } catch (err) {
      toast.error('Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/coding/goals', newGoal);
      toast.success('War Goal Created');
      setShowAdd(false);
      setNewGoal({ title: '', target: '', deadline: '', priority: 'Medium' });
      fetchGoals();
    } catch (err) {
      toast.error('Failed to create goal');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/coding/goals/${id}`);
      toast.success('Goal Retracted');
      fetchGoals();
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">{[1,2].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/5" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest">Active Objectives</h3>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-3 py-1 bg-[#E50914]/10 border border-[#E50914]/30 text-[#E50914] rounded-md hover:bg-[#E50914]/20 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <Plus size={14} /> {showAdd ? 'Cancel' : 'New Goal'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-[#050505] border border-[#E50914]/30 p-5 rounded-xl space-y-4">
          <input 
            type="text" 
            placeholder="Goal Title (e.g. Master DP)" 
            className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-[#E50914] outline-none"
            value={newGoal.title}
            onChange={e => setNewGoal({...newGoal, title: e.target.value})}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Target (e.g. 50 Problems)" 
              className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-[#E50914] outline-none"
              value={newGoal.target}
              onChange={e => setNewGoal({...newGoal, target: e.target.value})}
            />
            <input 
              type="date" 
              className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-[#E50914] outline-none"
              value={newGoal.deadline}
              onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-[#E50914] text-white font-black uppercase tracking-widest py-2 rounded-md hover:bg-[#b00710] transition-all">
            Deploy Objective
          </button>
        </form>
      )}

      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-center py-10 text-gray-500 uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-xl">No active war goals</div>
        ) : goals.map(goal => (
          <div key={goal._id} className="bg-[#050505] border border-white/10 p-5 rounded-xl hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-white font-bold text-lg">{goal.title}</h4>
                <p className="text-[#E50914] text-[10px] font-black uppercase tracking-widest mt-1">{goal.target || 'General Pursuit'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(goal._id)} className="text-gray-600 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-bold">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-[#E50914]" />
                Deadline: {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'Continuous'}
              </div>
              <div className={`px-2 py-0.5 rounded ${
                goal.priority === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
              }`}>
                {goal.priority}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StrategyBoard;
