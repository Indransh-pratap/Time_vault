import React, { useState, useEffect } from 'react';
import { Timer, Play, Square, CheckCircle, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const DirectSolve: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [time, setTime] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    platform: 'LeetCode',
    link: '',
    difficulty: 'Medium'
  });

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/coding/sessions');
      setSessions(data);
    } catch (err) {
      toast.error('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    let interval: any;
    if (activeSession) {
      interval = setInterval(() => setTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const startSession = () => {
    if (!formData.title) return toast.error('Enter problem title');
    setActiveSession({ ...formData, startTime: Date.now() });
    setTime(0);
    toast.success('Session Started');
  };

  const stopSession = async (status: string) => {
    try {
      const sessionData = {
        ...formData,
        status,
        timeSpent: time,
        createdAt: new Date()
      };
      await api.post('/coding/sessions', sessionData);
      toast.success(status === 'Solved' ? 'Problem Decoded! XP Awarded' : 'Session Stored');
      setActiveSession(null);
      setTime(0);
      setFormData({ title: '', platform: 'LeetCode', link: '', difficulty: 'Medium' });
      fetchSessions();
    } catch (err) {
      toast.error('Failed to save session');
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="animate-pulse space-y-4">{[1,2].map(i => <div key={i} className="h-24 bg-white/5 rounded-xl border border-white/5" />)}</div>;

  return (
    <div className="space-y-6">
      {!activeSession ? (
        <div className="bg-[#050505] border border-white/10 p-6 rounded-xl space-y-4">
          <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
            <Play size={16} className="text-[#E50914]" /> Initiate Solve Sequence
          </h3>
          <input 
            type="text" 
            placeholder="Problem Title" 
            className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-[#E50914] outline-none"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <select 
              className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-[#E50914] outline-none"
              value={formData.platform}
              onChange={e => setFormData({...formData, platform: e.target.value})}
            >
              <option>LeetCode</option>
              <option>Codeforces</option>
              <option>CodeChef</option>
              <option>AtCoder</option>
            </select>
            <select 
              className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-[#E50914] outline-none"
              value={formData.difficulty}
              onChange={e => setFormData({...formData, difficulty: e.target.value})}
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
          <input 
            type="text" 
            placeholder="Link (Optional)" 
            className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-[#E50914] outline-none"
            value={formData.link}
            onChange={e => setFormData({...formData, link: e.target.value})}
          />
          <button onClick={startSession} className="w-full bg-[#E50914] text-white font-black uppercase tracking-widest py-3 rounded-md hover:bg-[#b00710] transition-all flex items-center justify-center gap-2">
            Start Session <Timer size={18} />
          </button>
        </div>
      ) : (
        <div className="bg-[#0B0C10] border-2 border-[#E50914] p-8 rounded-xl text-center space-y-6 shadow-[0_0_30px_rgba(229,9,20,0.2)]">
          <div className="text-[#E50914] text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Session Active</div>
          <h2 className="text-3xl font-black text-white">{activeSession.title}</h2>
          <div className="text-6xl font-black text-white font-mono">{fmt(time)}</div>
          
          <div className="grid grid-cols-2 gap-4 pt-4">
            <button onClick={() => stopSession('Solved')} className="bg-green-600 text-white font-black uppercase tracking-widest py-3 rounded-md hover:bg-green-700 transition-all flex items-center justify-center gap-2">
              Mark Solved <CheckCircle size={18} />
            </button>
            <button onClick={() => stopSession('Attempting')} className="bg-gray-800 text-white font-black uppercase tracking-widest py-3 rounded-md hover:bg-gray-900 transition-all flex items-center justify-center gap-2">
              Pause/Stop <Square size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Recent Activity</h4>
        {sessions.map((s, i) => (
          <div key={i} className="bg-[#050505] border border-white/5 p-4 rounded-lg flex items-center justify-between group">
            <div className="flex items-center gap-4">
              <div className={`w-2 h-10 rounded-full ${s.status === 'Solved' ? 'bg-green-500' : 'bg-[#E50914]'}`}></div>
              <div>
                <div className="text-white text-sm font-bold">{s.title}</div>
                <div className="text-[10px] text-gray-500 uppercase font-black">{s.platform} • {fmt(s.timeSpent)} spent</div>
              </div>
            </div>
            {s.link && (
              <a href={s.link} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-white transition-colors">
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DirectSolve;
