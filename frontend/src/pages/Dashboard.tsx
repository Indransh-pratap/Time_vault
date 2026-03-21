import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Calendar, Target, Activity, Menu, X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TaskList from '../components/TaskList';
import AnalyticsHeatmap from '../components/AnalyticsHeatmap';
import TargetsDashboard from '../components/TargetsDashboard';
import PlannerView from '../components/PlannerView';
import SubscriptionModal from '../components/SubscriptionModal';
import { Toaster } from 'react-hot-toast';
import StudyTrackerCard from '../components/StudyTrackerCard';

export default function Dashboard() {
  const { mongoUser, logout } = useAuth();
  const [showProModal, setShowProModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'planner' | 'targets' | 'analytics'>('tasks');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id: 'tasks', label: 'Directives', icon: LayoutDashboard },
    { id: 'planner', label: 'Timeline', icon: Calendar },
    { id: 'targets', label: 'Objectives', icon: Target },
    { id: 'analytics', label: 'Metrics', icon: Activity },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'tasks':
        return <TaskList />;
      case 'planner':
        return <PlannerView />;
      case 'targets':
        return <TargetsDashboard />;
      case 'analytics':
        return <AnalyticsHeatmap />;
      default:
        return <TaskList />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] flex overflow-hidden font-sans text-gray-200">
      <Toaster position="top-right" />
      
      {/* Sidebar background overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#050505] border-r border-[#E50914]/30 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 flex flex-col`}>
        <div className="p-6 border-b border-[#E50914]/20 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-widest uppercase text-[#E50914] drop-shadow-[0_0_8px_#E50914]">
            TimeVault
          </h1>
          <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
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

        <div className="p-4 border-t border-[#E50914]/20">
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
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")',
               animation: 'fogMove 30s linear infinite' 
             }}>
        </div>

        {/* Top Navbar */}
        <header className="h-20 border-b border-[#E50914]/20 bg-[#050505]/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-400" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-white/90 hidden sm:block">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowProModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#E50914]/10 border border-[#E50914] text-[#E50914] hover:bg-[#E50914] hover:text-white transition-all duration-300 uppercase tracking-wider font-mono text-xs md:text-sm font-bold shadow-[0_0_15px_rgba(229,9,20,0.2)] rounded-sm"
            >
              <Zap size={16} className="animate-pulse" />
              {mongoUser?.subscription?.status === 'pro' ? 'Pro Active' : 'Go Pro'}
            </button>
            
            <div className="flex items-center gap-3 border-l border-gray-800 pl-6">
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
        </header>

        {/* Main Content Scrolling Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 z-10 relative">
          <div className="max-w-5xl mx-auto w-full">
            <StudyTrackerCard />
          </div>
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
      </div>

      {showProModal && <SubscriptionModal onClose={() => setShowProModal(false)} />}
    </div>
  );
}
