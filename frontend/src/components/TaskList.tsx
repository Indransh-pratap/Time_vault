import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';
import TaskItem, { type Task } from './TaskItem';
import { Plus, Zap, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import type { UseXPReturn } from '../hooks/useXP';

// ─── XP Popup ────────────────────────────────────────────────────────────────

interface XPPopup { id: number; amount: number; x: number; y: number }

// ─── Component ────────────────────────────────────────────────────────────────

interface TaskListProps {
  xpHook: UseXPReturn;
}

const TaskList = ({ xpHook }: TaskListProps) => {
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading,      setLoading]      = useState(true);
  const [xpPopups,     setXpPopups]     = useState<XPPopup[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const popupIdRef = useRef(0);

  useEffect(() => { fetchTasks(); }, [selectedDate]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tasks?date=${selectedDate}`);
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
      toast.error('Failed to communicate with servers');
    } finally {
      setLoading(false);
    }
  };

  // ── XP popup animation ────────────────────────────────────────────────────
  const showXPPopup = useCallback((amount: number) => {
    const id = ++popupIdRef.current;
    const x = 60 + Math.random() * 40; // % from left on task area
    const y = 30 + Math.random() * 30;
    setXpPopups((prev) => [...prev, { id, amount, x, y }]);
    setTimeout(() => setXpPopups((prev) => prev.filter((p) => p.id !== id)), 1800);
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tempId = Date.now().toString();
    const tempTask: Task = { _id: tempId, title: newTaskTitle, completed: false, priority: 'medium', missed: false };

    setTasks(prev => [tempTask, ...prev]);
    setNewTaskTitle('');

    try {
      const res = await api.post('/tasks', { title: tempTask.title, priority: 'medium', date: selectedDate });
      setTasks(prev => prev.map(t => t._id === tempId ? res.data : t));
      toast.success('Objective created');
    } catch (error) {
      setTasks(prev => prev.filter(t => t._id !== tempId));
      console.error('Failed to create task', error);
      toast.error('Failed to create objective');
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    const prevTasks = tasks;
    setTasks(tasks.map(t => t._id === id ? { ...t, ...updates } : t));

    // Award XP when completing a task
    if (updates.completed === true) {
      const task = tasks.find(t => t._id === id);
      if (task && !task.completed) {
        const gained = await xpHook.awardXP(task.title);
        showXPPopup(gained);
      }
    }

    try {
      await api.put('/tasks', { id, ...updates });
    } catch (error) {
      console.error('Failed to update task', error);
      toast.error('Failed to update objective');
      setTasks(prevTasks);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setTasks(tasks.filter(t => t._id !== id));
    try {
      await api.delete('/tasks', { data: { id } });
      toast.success('Objective deleted');
    } catch (error) {
      console.error('Failed to delete task', error);
      toast.error('Failed to delete objective');
      fetchTasks();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full relative z-10">
      {/* XP Popups */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {xpPopups.map((popup) => (
            <motion.div
              key={popup.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -60, scale: 1.1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: 'easeOut' }}
              style={{ left: `${popup.x}%`, top: `${popup.y}%`, position: 'absolute' }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#E50914] text-white text-xs font-bold font-mono shadow-[0_0_20px_rgba(229,9,20,0.6)] whitespace-nowrap"
            >
              <Zap size={11} /> +{popup.amount} XP
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Date Selector */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <CalendarIcon size={18} className="text-[#E50914]" />
          <h3 className="text-sm font-bold font-mono tracking-widest text-[#E50914] uppercase drop-shadow-[0_0_8px_#E50914]">
            {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { const d = new Date(selectedDate); d.setUTCDate(d.getUTCDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} 
            className="p-1 hover:bg-[#E50914]/10 rounded border border-transparent hover:border-[#E50914]/30 text-gray-400 hover:text-[#E50914] transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          {selectedDate !== new Date().toISOString().split('T')[0] && (
            <button 
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} 
              className="px-2 py-1 text-[10px] font-mono tracking-widest uppercase border border-gray-800 rounded hover:border-[#E50914]/50 hover:text-[#E50914] hover:bg-[#E50914]/5 transition-all shadow-sm"
            >
              Today
            </button>
          )}
          <button 
            onClick={() => { const d = new Date(selectedDate); d.setUTCDate(d.getUTCDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} 
            className="p-1 hover:bg-[#E50914]/10 rounded border border-transparent hover:border-[#E50914]/30 text-gray-400 hover:text-[#E50914] transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <form onSubmit={handleCreateTask} className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder={`Declare new objective for ${selectedDate}...`}
          className="flex-1 bg-[#111] border-2 border-gray-800 text-white p-4 font-mono uppercase tracking-widest focus:outline-none focus:border-[#E50914] focus:shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all duration-300 placeholder:text-gray-600 rounded-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-transparent border-2 border-gray-800 text-gray-500 px-8 hover:border-[#E50914] hover:bg-[#E50914]/10 hover:text-[#E50914] hover:shadow-[0_0_15px_rgba(229,9,20,0.3)] transition-all duration-300 flex items-center justify-center uppercase tracking-widest font-bold disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
        >
          <Plus size={24} className={newTaskTitle.trim() ? 'animate-pulse' : ''} />
        </button>
      </form>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-[100px] bg-[#111] border-2 border-gray-800 rounded-sm animate-pulse flex items-center p-5 gap-4">
              <div className="w-6 h-6 rounded-sm bg-gray-800" />
              <div className="flex-1 flex flex-col gap-3">
                <div className="h-5 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : (
          <AnimatePresence>
            {tasks.map(task => (
              <TaskItem
                key={task._id}
                task={task}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </AnimatePresence>
        )}

        {!loading && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="xl:col-span-2 text-center text-[#E50914]/70 py-16 border-2 border-dashed border-[#E50914]/30 tracking-widest uppercase font-mono bg-[#E50914]/5 rounded-sm"
          >
            No active objectives found in this timeline.
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TaskList;
