import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import TaskItem, { type Task } from './TaskItem';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (error) {
      console.error('Failed to fetch tasks', error);
      toast.error('Failed to communicate with servers');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const tempId = Date.now().toString();
    const tempTask: Task = { _id: tempId, title: newTaskTitle, completed: false, priority: 'medium', missed: false };
    
    setTasks(prev => [tempTask, ...prev]);
    setNewTaskTitle('');

    try {
      const res = await api.post('/tasks', { title: tempTask.title, priority: 'medium' });
      setTasks(prev => prev.map(t => t._id === tempId ? res.data : t));
      toast.success('Objective created');
    } catch (error) {
      setTasks(prev => prev.filter(t => t._id !== tempId));
      console.error('Failed to create task', error);
      toast.error('Failed to create objective');
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    setTasks(tasks.map(t => t._id === id ? { ...t, ...updates } : t));
    try {
      await api.put('/tasks', { id, ...updates });
    } catch (error) {
      console.error('Failed to update task', error);
      toast.error('Failed to update objective');
      fetchTasks(); 
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
      <form onSubmit={handleCreateTask} className="flex gap-2">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Declare new objective..."
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
              <div className="w-6 h-6 rounded-sm bg-gray-800"></div>
              <div className="flex-1 flex flex-col gap-3">
                <div className="h-5 bg-gray-800 rounded w-3/4"></div>
                <div className="h-3 bg-gray-800 rounded w-1/4"></div>
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
