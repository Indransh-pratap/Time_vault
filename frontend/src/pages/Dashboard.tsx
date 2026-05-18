import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogOut, LayoutDashboard, Calendar, Target, Activity,
  Menu, X, Zap, Bell, Music, StickyNote, Maximize2, Clock, MessageSquare, User, Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskList from '../components/TaskList';
import StudyMetrics from '../components/StudyMetrics';
import TargetsDashboard from '../components/TargetsDashboard';
import PlannerView from '../components/PlannerView';
import SubscriptionModal from '../components/SubscriptionModal';
import { Toaster } from 'react-hot-toast';
import AlarmClock from '../components/AlarmClock';
import FocusMusic from '../components/FocusMusic';
import NotesView from '../components/NotesView';
import ProfileView from '../components/ProfileView';
import XPBar from '../components/XPBar';
import FloatingTimer from '../components/FloatingTimer';
import FloatingMusicPlayer from '../components/FloatingMusicPlayer';
import FocusMode from '../components/FocusMode';
import CodingVaultView from '../components/CodingVaultView';

import { useXP } from '../hooks/useXP';
import { useSocket } from '../context/SocketContext';
import api from '../lib/api';
import Chat_bot from '../components/AI_chat_bot';

type TabId = 'tasks' | 'planner' | 'targets' | 'analytics' | 'alarm' | 'music' | 'notes' | 'profile' |'chatbot' | 'coding_vault';

const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600).toString().padStart(2, '0');
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

import toast from 'react-hot-toast';

const TZ_OFFSET = new Date().getTimezoneOffset() * -1;

export default function Dashboard() {
  const { mongoUser, logout } = useAuth();
  const [showProModal,    setShowProModal]    = useState(false);
  const location = useLocation();
  const [activeTab,       setActiveTab]       = useState<TabId>(() => {
    return location.pathname === '/daily' ? 'planner' : 'tasks';
  });
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [focusModeOpen,   setFocusModeOpen]   = useState(false);
  const [todayStudy,      setTodayStudy]      = useState(0);
  const xp = useXP();
  const socket = useSocket();

  // Fetch today's study total
  const fetchTodayStudy = useCallback(async () => {
    try {
      const { data } = await api.get(`/timer/today?tz=${TZ_OFFSET}`);
      const total = (data as any[]).reduce((acc, s) => acc + (s.duration || 0), 0);
      setTodayStudy(total);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchTodayStudy();
  }, [fetchTodayStudy]);

  // Real-time update for today's study time in header
  const handleStudyUpdate = useCallback((data: { total?: number }) => {
    if (data.total !== undefined) setTodayStudy(data.total);
    else fetchTodayStudy();
  }, [fetchTodayStudy]);

  useEffect(() => {
    if (!socket) return;
    socket.on('study:sync', handleStudyUpdate);
    return () => { socket.off('study:sync', handleStudyUpdate); };
  }, [socket, handleStudyUpdate]);

  // ── Background / Visibility Tracking ──────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        toast('Background limit: Keep app open for best experience', {
          icon: '⚠️',
          duration: 4000,
          style: { background: '#111', color: '#ffcc00', border: '1px solid #ffcc00', fontSize: '12px' }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'tasks',     label: 'Directives',  icon: LayoutDashboard },
    { id: 'planner',   label: 'Timeline',    icon: Calendar },
    { id: 'targets',   label: 'Objectives',  icon: Target },
    { id: 'analytics', label: 'Metrics',     icon: Activity },
    { id: 'alarm',     label: 'Alarm',       icon: Bell },
    { id: 'notes',     label: 'Notes',       icon: StickyNote },
    { id: 'music',     label: 'Focus Music', icon: Music },
    { id: 'coding_vault', label: 'Coding Vault', icon: Terminal },
    { id: 'profile',   label: 'Profile',     icon: User },
    { id: 'chatbot', label: 'Chatbot', icon: MessageSquare },

  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'tasks':     return <TaskList xpHook={xp} />;
      case 'planner':   return <PlannerView dailyStreak={xp.streak} />;
      case 'targets':   return <TargetsDashboard />;
      case 'analytics': return <StudyMetrics />;
      case 'alarm':     return <AlarmClock />;
      case 'notes':     return <NotesView />;
      case 'music':     return <FocusMusic />;
      case 'coding_vault': return <CodingVaultView />;
      case 'profile':   return <ProfileView />;
    case 'chatbot':
  return <Chat_bot />;
      default:          return <TaskList xpHook={xp} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] flex overflow-hidden font-sans text-gray-200">
      <Toaster position="top-right" />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#050505] border-r border-[#E50914]/30 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 flex flex-col pt-safe`}>
        <div className="p-6 border-b border-[#E50914]/20 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-[#E50914] drop-shadow-[0_0_8px_#E50914]">
            TimeVault
          </h1>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-md transition-all duration-300 font-mono tracking-wider uppercase text-sm ${
                activeTab === tab.id
                  ? 'bg-[#E50914]/10 text-[#E50914] border-l-2 border-[#E50914] shadow-[inset_4px_0_10px_rgba(229,9,20,0.1)]'
                  : 'text-gray-400 hover:bg-gray-900 hover:text-white border-l-2 border-transparent'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'animate-pulse' : ''} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Contact Developer Link */}
        <div className="px-4 py-4 border-t border-[#E50914]/10">
          <Link
            to="/contact"
            className="flex items-center gap-4 px-4 py-3 rounded-md text-gray-500 hover:bg-red-500/5 hover:text-[#E50914] transition-all duration-300 font-mono tracking-widest uppercase text-[10px]"
          >
            <MessageSquare size={14} />
            Contact Developer
          </Link>
        </div>

        {/* Sidebar bottom: Focus Mode button + level badge + disconnect */}
        <div className="p-4 border-t border-[#E50914]/20 space-y-3">
          {/* Focus Mode shortcut in sidebar */}
          <button
            onClick={() => setFocusModeOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md font-mono uppercase text-sm tracking-wider bg-[#E50914]/5 border border-[#E50914]/20 text-[#E50914]/70 hover:bg-[#E50914]/15 hover:text-[#E50914] hover:border-[#E50914]/50 transition-all"
          >
            <Maximize2 size={16} />
            Focus Mode
          </button>

          {/* Mini XP display in sidebar */}
          <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-black/30 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#E50914] to-[#ff6b35] flex items-center justify-center shadow-[0_0_10px_rgba(229,9,20,0.4)] flex-shrink-0">
              <span className="text-white font-black font-mono text-xs">{xp.level}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Daily XP</p>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-black/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#E50914] to-[#ff6b35] rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((xp.dailyXP / 100) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-[#45A29E] tabular-nums">{xp.dailyXP}/100</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-[#E50914] hover:bg-[#E50914]/10 transition-colors rounded-md font-mono uppercase text-sm tracking-wider"
          >
            <LogOut size={16} /> Disconnect
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background texture */}
        <div
          className="absolute inset-0 z-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")',
            animation: 'fogMove 30s linear infinite',
          }}
        />

        {/* Top Navbar */}
        <header className="border-b border-[#E50914]/20 bg-[#050505]/80 backdrop-blur-md z-10 sticky top-0 pt-safe">
          {/* Row 1: nav + user */}
          <div className="h-16 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
              <button className="md:hidden text-gray-400" onClick={() => setSidebarOpen(true)}>
                <Menu size={24} />
              </button>
              <h2 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-white/90 hidden sm:block">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
              {/* Today's study time chip */}
              {todayStudy > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/8 bg-white/3 font-mono text-xs text-gray-400"
                >
                  <Clock size={11} className="text-[#45A29E]" />
                  <span className="tabular-nums text-[#45A29E]">{fmtTime(todayStudy)}</span>
                  <span className="text-gray-700 text-[10px]">today</span>
                </motion.div>
              )}

              {/* Focus Mode button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFocusModeOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#E50914]/30 bg-[#E50914]/8 text-[#E50914]/80 hover:border-[#E50914]/70 hover:bg-[#E50914]/15 hover:text-[#E50914] transition-all font-mono text-xs uppercase tracking-wider"
              >
                <Maximize2 size={14} />
                <span className="hidden md:inline">Focus</span>
              </motion.button>

              <button
                onClick={() => setShowProModal(true)}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-[#E50914]/10 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white transition-all duration-300 uppercase tracking-wider font-mono text-xs md:text-sm font-bold shadow-[0_0_15px_rgba(229,9,20,0.2)] rounded-sm"
              >
                <Zap size={16} className="animate-pulse" />
                <span className="hidden sm:inline">{mongoUser?.subscription?.status === 'pro' ? 'Pro Active' : 'Go Pro'}</span>
              </button>

              <div className="flex items-center gap-3 border-l border-gray-800 pl-3 md:pl-4">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-bold text-white tracking-widest uppercase">{mongoUser?.name || 'Operative'}</span>
                  <span className="text-xs text-[#E50914] font-mono tracking-widest">{mongoUser?.subscription?.status || 'free'} tier</span>
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-[#E50914] overflow-hidden shadow-[0_0_10px_#E50914] bg-black">
                  {mongoUser?.image ? (
                    <img src={mongoUser.image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center text-[#E50914] font-bold font-mono">
                      {mongoUser?.name?.charAt(0) || 'O'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: XP bar */}
          <div className="px-4 md:px-8 py-2 border-t border-white/5">
            <XPBar
              totalXP={xp.totalXP}
              dailyXP={xp.dailyXP}
              level={xp.level}
              streak={xp.streak}
              loading={xp.loading}
            />
          </div>
        </header>

        {/* Main Content Scrolling Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10 relative pb-safe">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.02, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-5xl mx-auto h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Footer watermark */}
        <div className="mt-20 pb-12 flex flex-col items-center gap-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.5em] font-black text-[#ff3b3b] drop-shadow-[0_0_10px_#ff3b3b]">
            Made by Indransh ❤️
          </p>
          <div className="flex items-center gap-4 text-[8px] font-mono grayscale opacity-20">
            <span>Systems v2.4</span>
            <span className="w-1 h-1 rounded-full bg-gray-800" />
            <span>Encrypted Node</span>
          </div>
        </div>
      </div>

      {/* Floating Timer — always visible across all tabs */}
      <FloatingTimer />
      <FloatingMusicPlayer />

      {/* Focus Mode — full-screen overlay */}
      <AnimatePresence>
        {focusModeOpen && (
          <FocusMode onClose={() => { setFocusModeOpen(false); fetchTodayStudy(); }} />
        )}
      </AnimatePresence>

      {showProModal && <SubscriptionModal onClose={() => setShowProModal(false)} />}
    </div>
  );
}
