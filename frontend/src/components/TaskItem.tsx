import React, { useState } from 'react';
import { Check, Clock, Trash2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
  timeSpent?: number;
  missed: boolean;
}

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleToggleComplete = async () => {
    setIsCompleting(true);
    await onUpdate(task._id, { completed: !task.completed });
    setIsCompleting(false);
  };

  const isMissed = task.missed || (task.deadline && new Date(task.deadline) < new Date() && !task.completed);
  const applyGlitch = isMissed && !task.completed;
  
  // Dynamic Styles based on State
  let containerStyles = "border border-gray-800 bg-[#111] hover:border-gray-500 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]";
  let titleStyles = "text-white";
  let checkStyles = "border-gray-600 hover:border-green-500 text-transparent hover:text-green-500";
  
  if (task.completed) {
    containerStyles = "border-green-900 bg-[#051505] shadow-[inset_0_0_20px_rgba(34,197,94,0.05)] opacity-70 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]";
    titleStyles = "line-through text-green-600";
    checkStyles = "bg-green-600 border-green-500 text-white shadow-[0_0_10px_#22c55e]";
  } else if (applyGlitch) {
    containerStyles = "border-[#E50914] bg-[#1a0505] shadow-[0_0_15px_rgba(229,9,20,0.3)] animate-pulse";
    titleStyles = "text-glitch text-[#E50914]";
    checkStyles = "border-[#E50914] hover:bg-[#E50914] text-transparent hover:text-white";
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`p-5 rounded-sm group transition-all duration-300 flex flex-col justify-between min-h-[100px] relative overflow-hidden ${containerStyles}`}
    >
      {applyGlitch && (
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
      )}

      <div className="flex justify-between items-start z-10 h-full">
        <div className="flex gap-4 items-start w-full pr-8">
          <button 
            onClick={handleToggleComplete}
            disabled={isCompleting}
            className={`w-6 h-6 mt-1 flex-shrink-0 flex items-center justify-center border-2 transition-all duration-300 rounded-sm ${checkStyles}`}
          >
            <Check size={14} className={isCompleting ? 'animate-ping' : ''} />
          </button>
          
          <div className="flex flex-col gap-1 w-full justify-center h-full pt-1">
            <h3 className={`text-lg font-bold tracking-wider font-mono uppercase break-words leading-tight ${titleStyles}`}>
              {task.title}
            </h3>
            
            {(task.description || task.deadline || applyGlitch) && (
              <div className={`text-xs flex flex-wrap gap-3 font-mono tracking-widest mt-2 ${applyGlitch ? 'text-[#E50914]' : task.completed ? 'text-green-800' : 'text-gray-500'}`}>
                {task.deadline && (
                  <span className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-sm border border-current/20">
                    <Clock size={12} /> {new Date(task.deadline).toLocaleDateString()}
                  </span>
                )}
                {applyGlitch && (
                  <span className="flex items-center gap-1 bg-[#E50914]/20 px-2 py-1 rounded-sm border border-[#E50914]/50">
                    <AlertCircle size={12} /> BREACH DETECTED
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <button 
        onClick={() => onDelete(task._id)}
        className={`absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 transition-all duration-300 z-10 bg-black/50 border rounded-sm hover:-translate-y-1 ${
          applyGlitch ? 'text-[#E50914] border-[#E50914] hover:bg-[#E50914]/20' : 'text-gray-500 border-gray-700 hover:text-[#E50914] hover:border-[#E50914]'
        }`}
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
};

export default TaskItem;
