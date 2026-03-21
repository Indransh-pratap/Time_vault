import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Target as TargetIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TargetData {
  _id: string;
  type: string;
  goal: string;
  progress: number;
}

const TargetsDashboard = () => {
  const [targets, setTargets] = useState<TargetData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/targets')
       .then(res => setTargets(res.data))
       .catch((err) => {
         console.error(err);
         toast.error("Failed to load targets");
       })
       .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full p-2">
      <h3 className="text-xl font-bold uppercase tracking-widest text-white border-b-2 border-gray-900 pb-3 flex justify-between items-center">
        <span>Strategic Targets</span>
        <TargetIcon size={20} className="text-[#E50914] drop-shadow-[0_0_5px_#E50914]" />
      </h3>

      <div className="flex flex-col gap-5">
        {loading ? (
          [...Array(2)].map((_, i) => (
            <div key={i} className="h-20 bg-[#111] animate-pulse border border-gray-800 rounded-sm"></div>
          ))
        ) : targets.length === 0 ? (
          <div className="text-[#E50914]/70 bg-[#E50914]/5 font-mono text-sm tracking-widest uppercase text-center py-8 border-2 border-dashed border-[#E50914]/30 rounded-sm">
            No active targets found.
          </div>
        ) : (
          targets.map((t) => (
            <div key={t._id} className="bg-[#111] border border-gray-800 p-4 rounded-sm relative overflow-hidden group hover:border-gray-500 transition-colors">
              <div className="flex justify-between mb-3">
                <span className="text-sm font-bold text-gray-200 uppercase tracking-widest font-mono z-10">{t.goal}</span>
                <span className="text-xs text-[#E50914] font-mono tracking-widest z-10 font-bold">{t.progress}%</span>
              </div>
              <div className="w-full bg-black h-2 rounded-full overflow-hidden relative z-10 border border-gray-800">
                <div 
                  className="bg-gradient-to-r from-red-900 to-[#E50914] h-full transition-all duration-1000 ease-out shadow-[0_0_10px_#E50914]" 
                  style={{ width: `${t.progress}%` }}
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
