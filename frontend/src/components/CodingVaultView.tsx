import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Trophy, 
  Target, 
  RefreshCw, 
  ExternalLink,
  Flame,
  BarChart3,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';

import Contests from './CodingVault/Contests';
import StrategyBoard from './CodingVault/StrategyBoard';
import DirectSolve from './CodingVault/DirectSolve';
import Analytics from './CodingVault/Analytics';

type SubTab = 'overview' | 'contests' | 'strategy' | 'solve' | 'analytics' | 'profile';

const CodingVaultView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const fetchBaseData = async () => {
    try {
      const [profRes, statsRes] = await Promise.all([
        api.get('/coding/profile'),
        api.get('/coding/analytics')
      ]);
      setProfile(profRes.data);
      setStats(statsRes.data.stats);
      
      // Lazy sync check (6 hours)
      const lastSync = new Date(profRes.data.lastUpdated).getTime();
      const sixHours = 6 * 60 * 60 * 1000;
      if (Date.now() - lastSync > sixHours && profRes.data.leetcodeUsername) {
        handleSync();
      }
    } catch (err) {
      toast.error('Failed to load coding data');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    toast.loading('Syncing with platforms...', { id: 'sync' });
    try {
      const { data } = await api.post('/coding/sync');
      setProfile(data.profile);
      setStats(data.stats);
      toast.success('Sync complete!', { id: 'sync' });
    } catch (err) {
      toast.error('Sync failed', { id: 'sync' });
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  const subTabs: { id: SubTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Code2 },
    { id: 'contests', label: 'Contests', icon: Trophy },
    { id: 'strategy', label: 'War Plan', icon: Target },
    { id: 'solve', label: 'Direct Solve', icon: Timer },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profiles', icon: ExternalLink },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914]"></div>
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="text-[#E50914]">CODING</span> VAULT
          </h2>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-wider">Competitive Programming Headquarters</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2 bg-[#E50914]/10 border border-[#E50914]/30 text-[#E50914] rounded-md hover:bg-[#E50914]/20 transition-all text-sm font-semibold uppercase tracking-widest"
          >
            <RefreshCw size={16} className={profile?.syncStatus === 'syncing' ? 'animate-spin' : ''} />
            {profile?.syncStatus === 'syncing' ? 'Syncing...' : 'Sync Ops'}
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide border-b border-white/5">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap border-b-2 ${
              activeSubTab === tab.id 
                ? 'bg-[#E50914]/10 text-[#E50914] border-[#E50914]' 
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            <tab.icon size={18} />
            <span className="text-sm font-bold uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeSubTab === 'overview' && <Overview stats={stats} profile={profile} />}
            {activeSubTab === 'contests' && <Contests />}
            {activeSubTab === 'strategy' && <StrategyBoard />}
            {activeSubTab === 'solve' && <DirectSolve />}
            {activeSubTab === 'analytics' && <Analytics stats={stats} />}
            {activeSubTab === 'profile' && <ProfileSettings profile={profile} onUpdate={fetchBaseData} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Sub-components ---

const Overview = ({ stats, profile }: any) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Streak Card */}
      <div className="bg-[#050505] border border-white/10 p-6 rounded-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
          <Flame size={80} className="text-orange-500" />
        </div>
        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">Total Coding Streak</h3>
        <div className="flex items-end gap-3">
          <span className="text-5xl font-black text-white">{profile?.combinedStreak || 0}</span>
          <span className="text-orange-500 font-bold mb-1">DAYS</span>
        </div>
        <p className="text-xs text-gray-500 mt-4 uppercase tracking-tighter">Flame intensity: Critical</p>
      </div>

      {/* Problems Card */}
      <div className="bg-[#050505] border border-white/10 p-6 rounded-xl col-span-1 md:col-span-2">
        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-4">Problem Distribution</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/5 rounded-lg border border-white/5">
            <div className="text-green-500 text-2xl font-black">{stats?.leetcode?.easy || 0}</div>
            <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Easy</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg border border-white/5">
            <div className="text-yellow-500 text-2xl font-black">{stats?.leetcode?.medium || 0}</div>
            <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Medium</div>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-lg border border-white/5">
            <div className="text-red-500 text-2xl font-black">{stats?.leetcode?.hard || 0}</div>
            <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Hard</div>
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
        <PlatformCard title="LeetCode" value={stats?.leetcode?.totalSolved || 0} sub={`Rating: ${stats?.leetcode?.rating || 0}`} color="#FFA116" />
        <PlatformCard title="Codeforces" value={stats?.codeforces?.rating || 0} sub={stats?.codeforces?.rank || 'Unrated'} color="#1F8ACB" />
        <PlatformCard title="CodeChef" value={stats?.codechef?.rating || 0} sub={`${stats?.codechef?.stars || '0'} Stars`} color="#5B4638" />
        <PlatformCard title="GitHub" value={stats?.github?.contributions || 0} sub="Contributions" color="#40C463" />
      </div>
    </div>
  );
};

const PlatformCard = ({ title, value, sub, color }: any) => (
  <div className="bg-[#050505] border border-white/10 p-4 rounded-xl hover:border-white/20 transition-all">
    <div className="flex items-center gap-2 mb-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></div>
      <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{title}</span>
    </div>
    <div className="text-2xl font-black text-white">{value}</div>
    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{sub}</div>
  </div>
);

const ProfileSettings = ({ profile, onUpdate }: any) => {
  const [formData, setFormData] = useState({
    leetcodeUsername: profile?.leetcodeUsername || '',
    codeforcesHandle: profile?.codeforcesHandle || '',
    codechefUsername: profile?.codechefUsername || '',
    atcoderHandle: profile?.atcoderHandle || '',
    githubUsername: profile?.githubUsername || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/coding/profile', formData);
      toast.success('Handles updated');
      onUpdate();
    } catch (err) {
      toast.error('Failed to update handles');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 bg-[#050505] border border-white/10 p-6 rounded-xl">
      <h3 className="text-[#E50914] font-black uppercase tracking-widest mb-6 border-b border-[#E50914]/20 pb-2">Link Your Profiles</h3>
      
      {['leetcodeUsername', 'codeforcesHandle', 'codechefUsername', 'atcoderHandle', 'githubUsername'].map(field => (
        <div key={field} className="space-y-1">
          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{field.replace('Username', '').replace('Handle', '')}</label>
          <input
            type="text"
            value={(formData as any)[field]}
            onChange={e => setFormData({ ...formData, [field]: e.target.value })}
            placeholder={`Enter ${field}`}
            className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-[#E50914] outline-none transition-all"
          />
        </div>
      ))}

      <button type="submit" className="w-full bg-[#E50914] text-white font-black uppercase tracking-widest py-3 rounded-md hover:bg-[#b00710] transition-all mt-6 shadow-[0_0_15px_rgba(229,9,20,0.3)]">
        Save Ops Config
      </button>
    </form>
  );
};

export default CodingVaultView;
