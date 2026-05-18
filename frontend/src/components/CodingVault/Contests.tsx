import React, { useState, useEffect } from 'react';
import { Trophy, Clock, ExternalLink, Calendar } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const Contests: React.FC = () => {
  const [contests, setContests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchContests = async () => {
    try {
      const { data } = await api.get('/coding/contests');
      setContests(data);
    } catch (err) {
      toast.error('Failed to fetch contests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContests();
  }, []);

  const filtered = contests.filter(c => {
    if (filter === 'all') return true;
    const start = new Date(c.startTime).getTime();
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    if (filter === 'today') return start - now < 24 * 60 * 60 * 1000;
    if (filter === 'week') return start - now < oneWeek;
    return true;
  });

  if (loading) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl border border-white/5" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {['all', 'today', 'week'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-all ${
              filter === f ? 'bg-[#E50914] border-[#E50914] text-white' : 'border-white/10 text-gray-500 hover:text-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-10 text-gray-500 uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-xl">No upcoming contests found</div>
        ) : filtered.map((c, i) => (
          <div key={i} className="bg-[#050505] border border-white/10 p-5 rounded-xl flex flex-col justify-between hover:border-[#E50914]/40 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <Trophy size={60} />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-[#E50914]/10 text-[#E50914] text-[9px] font-black uppercase rounded">{c.platform}</span>
              </div>
              <h4 className="text-white font-bold text-sm mb-3 line-clamp-1">{c.name}</h4>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400 text-[10px] uppercase font-bold">
                  <Calendar size={12} className="text-[#E50914]" />
                  {new Date(c.startTime).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-[10px] uppercase font-bold">
                  <Clock size={12} className="text-[#E50914]" />
                  {Math.floor(c.duration / 3600)}H {Math.floor((c.duration % 3600) / 60)}M
                </div>
              </div>
            </div>

            <a 
              href={c.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-[#E50914] text-white text-[10px] font-black uppercase tracking-widest rounded transition-all"
            >
              Join Contest <ExternalLink size={12} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Contests;
