import { useEffect, useState } from 'react';
import api from '../lib/api';
import { subDays, format } from 'date-fns';
import { toast } from 'react-hot-toast';

const AnalyticsHeatmap = () => {
  const [data, setData] = useState<{ heatmap: Record<string, number>, totalTimeSpent: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics')
       .then(res => setData(res.data))
       .catch((err) => {
         console.error(err);
         toast.error("Failed to load metrics");
       })
       .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = subDays(today, 89 - i);
    return format(d, 'yyyy-MM-dd');
  });

  const getIntensityClass = (count: number) => {
    if (count === 0) return 'bg-[#0B0C10] border-gray-800';
    if (count < 3) return 'bg-[#8b0000]/60 border-transparent shadow-[0_0_5px_rgba(139,0,0,0.5)]';
    if (count < 6) return 'bg-[#E50914] border-transparent shadow-[0_0_10px_rgba(229,9,20,0.8)]';
    return 'bg-[#ff4444] border-transparent shadow-[0_0_15px_rgba(255,68,68,1)] animate-pulse';
  };

  return (
    <div className="flex flex-col gap-6 w-full relative z-10 p-2">
      <h3 className="text-xl font-bold uppercase tracking-widest text-white border-b-2 border-gray-900 pb-3">
        Temporal Metrics
      </h3>

      {loading || !data ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-24 bg-[#111] border border-gray-800 rounded-sm w-full"></div>
          <div className="h-32 bg-[#111] border border-gray-800 rounded-sm w-full"></div>
        </div>
      ) : (
        <>
          <div className="flex gap-4">
            <div className="bg-[#111] border border-[#E50914]/30 p-4 rounded-sm flex-1 shadow-[0_0_15px_rgba(229,9,20,0.1)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E50914]/10 to-transparent -translate-x-full group-hover:animate-[scanline_2s_linear_infinite]"></div>
              <p className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">Time Anchored</p>
              <p className="text-3xl font-bold font-mono text-[#E50914] drop-shadow-[0_0_8px_#E50914]">{data.totalTimeSpent} <span className="text-sm text-gray-500 tracking-widest">MIN</span></p>
            </div>
          </div>

          <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex flex-wrap gap-1.5 min-w-[600px] bg-[#050505] p-5 rounded-sm border border-gray-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              {days.map((day) => {
                const count = data.heatmap[day] || 0;
                return (
                  <div 
                    key={day}
                    className={`w-4 h-4 rounded-sm border ${getIntensityClass(count)} transition-all duration-300 hover:scale-150 hover:z-10 cursor-crosshair relative group`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1 bg-black border border-[#E50914] text-[#E50914] text-[10px] font-mono tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-[0_0_15px_rgba(229,9,20,0.5)]">
                      {day} | {count} Obj
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-3 font-mono uppercase tracking-widest px-1">
              <span>90 Days Ago</span>
              <span>Present Reality</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsHeatmap;
