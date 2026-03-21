import { useState, useEffect } from 'react';
import api from '../lib/api';
import type { Task } from './TaskItem';
import { Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PlannerData {
  _id: string;
  date: string;
  type: string;
  tasks: Task[];
}

const PlannerView = () => {
  const [planner, setPlanner] = useState<PlannerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    api.get(`/planner?type=daily&date=${today}`)
       .then(res => setPlanner(res.data))
       .catch((err) => {
         console.error(err);
         toast.error("Failed to sync timeline data");
       })
       .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <h3 className="text-xl font-bold uppercase tracking-widest text-white border-b-2 border-gray-900 pb-3 flex items-center justify-between">
        <span>Daily Timeline</span>
        <Calendar size={20} className="text-[#E50914] animate-pulse drop-shadow-[0_0_5px_#E50914]" />
      </h3>

      <div className="flex flex-col gap-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-[#111] border border-gray-800 rounded-sm animate-pulse flex items-center p-4"></div>
          ))
        ) : (!planner || !planner.tasks || planner.tasks.length === 0) ? (
          <div className="text-[#E50914]/70 bg-[#E50914]/5 font-mono text-sm tracking-widest uppercase text-center py-8 border-2 border-dashed border-[#E50914]/30 rounded-sm">
            Timeline vacant. Rest easy.
          </div>
        ) : (
          planner.tasks.map(task => (
            <div key={task._id} className="bg-[#111] border-l-4 border-l-[#E50914] border border-gray-800 p-3 pl-4 flex flex-col group hover:border-gray-500 hover:shadow-[0_0_15px_rgba(229,9,20,0.1)] transition-all duration-300 relative overflow-hidden rounded-r-sm">
              <span className={`text-sm tracking-wide font-bold uppercase font-mono ${task.completed ? 'line-through text-gray-600' : 'text-gray-100'}`}>
                {task.title}
              </span>
              {task.deadline && (
                <span className="text-xs text-[#E50914] font-mono opacity-0 group-hover:opacity-100 transition-opacity mt-2 flex gap-2 items-center tracking-widest">
                  <AlertCircle size={10} /> {new Date(task.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlannerView;
