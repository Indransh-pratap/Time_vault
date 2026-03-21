import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Calendar, Plus, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TimelineTask {
  _id: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  completed: boolean;
}

const PlannerView = () => {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const fetchTasks = () => {
    setLoading(true);
    api.get('/timeline')
       .then(res => setTasks(res.data))
       .catch((err) => {
         console.error(err);
         toast.error("Failed to fetch timeline");
       })
       .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = async () => {
    if (!title || !startTime || !endTime) {
      toast.error('Fill in all fields');
      return;
    }
    try {
      await api.post('/timeline', { title, startTime, endTime });
      setTitle('');
      setStartTime('');
      setEndTime('');
      fetchTasks();
      toast.success('Task added to timeline',  {
        style: { border: '1px solid #E50914', background: '#0B0C10', color: '#fff' }
      });
    } catch (e) {
      toast.error('Failed to add task');
    }
  };

  const toggleTask = async (id: string) => {
    try {
      await api.put(`/timeline/${id}`);
      fetchTasks();
    } catch (e) {
      toast.error('Failed to update task');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <h3 className="text-xl font-bold uppercase tracking-widest text-white border-b-2 border-gray-900 pb-3 flex items-center justify-between">
        <span>Daily Timeline</span>
        <Calendar size={20} className="text-[#E50914] animate-pulse drop-shadow-[0_0_5px_#E50914]" />
      </h3>

      {/* Input Section */}
      <div className="bg-[#111] border border-gray-800 p-4 rounded-sm flex flex-col md:flex-row gap-3 items-end md:items-center shadow-[0_4px_15px_rgba(0,0,0,0.5)]">
        <div className="flex-1 w-full">
          <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Title</label>
          <input 
            type="text" 
            placeholder="Mission Directive" 
            value={title} 
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
          />
        </div>
        <div className="w-full md:w-32">
          <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">Start</label>
          <input 
            type="time" 
            value={startTime} 
            onChange={e => setStartTime(e.target.value)}
            className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
          />
        </div>
        <div className="w-full md:w-32">
          <label className="text-xs text-gray-500 font-mono tracking-widest uppercase mb-1 block">End</label>
          <input 
            type="time" 
            value={endTime} 
            onChange={e => setEndTime(e.target.value)}
            className="w-full bg-[#050505] border border-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:border-[#E50914] transition-colors font-mono text-sm"
          />
        </div>
        <button 
          onClick={handleAddTask}
          className="w-full md:w-auto mt-4 md:mt-0 flex items-center justify-center gap-2 px-6 py-2 bg-[#E50914]/10 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white transition-all font-mono uppercase tracking-widest text-sm rounded shadow-[0_0_10px_rgba(229,9,20,0.2)]"
        >
          <Plus size={16} /> Add 
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[#111] border border-gray-800 rounded-sm animate-pulse flex items-center p-4"></div>
          ))
        ) : tasks.length === 0 ? (
          <div className="text-[#E50914]/70 bg-[#E50914]/5 font-mono text-sm tracking-widest uppercase text-center py-8 border-2 border-dashed border-[#E50914]/30 rounded-sm">
            Timeline vacant. Rest easy.
          </div>
        ) : (
          tasks.map(task => (
            <div 
              key={task._id} 
              onClick={() => toggleTask(task._id)}
              className={`cursor-pointer p-4 flex flex-col md:flex-row md:items-center justify-between group transition-all duration-300 relative overflow-hidden rounded-sm border-l-4 ${
                task.completed 
                  ? 'bg-[#051505] border-l-green-500 border border-t border-r border-b border-green-900 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)] hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]' 
                  : 'bg-[#111] border-l-[#E50914] border border-t border-r border-b border-gray-800 hover:border-gray-500 hover:shadow-[0_0_15px_rgba(229,9,20,0.2)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <button className={`w-5 h-5 rounded-sm flex items-center justify-center border transition-all ${
                  task.completed ? 'bg-green-500 border-green-500 text-black' : 'border-gray-600 group-hover:border-[#E50914] text-transparent'
                }`}>
                  <CheckCircle size={14} />
                </button>
                <span className={`text-sm tracking-wide font-bold uppercase font-mono ${task.completed ? 'line-through text-green-600' : 'text-gray-100 group-hover:text-white ' + (!task.completed ? 'text-glitch' : '')}`}>
                  {task.title}
                </span>
              </div>
              <div className="mt-3 md:mt-0 flex gap-2 items-center">
                <span className={`text-xs font-mono px-2 py-1 rounded-sm flex items-center gap-1 border ${task.completed ? 'text-green-500 bg-green-900/30 border-green-800/50' : 'text-[#E50914] bg-[#E50914]/10 border-[#E50914]/30'}`}>
                  <Clock size={12} /> {task.startTime} - {task.endTime}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlannerView;
