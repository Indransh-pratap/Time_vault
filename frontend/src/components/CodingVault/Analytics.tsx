import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

const Analytics: React.FC<{ stats: any }> = ({ stats }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LeetCode Details */}
        <div className="bg-[#050505] border border-white/10 p-5 rounded-xl">
          <h4 className="text-[#E50914] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp size={14} /> LeetCode Velocity
          </h4>
          <div className="space-y-4">
            <StatRow label="Easy" value={stats?.leetcode?.easy || 0} total={3000} color="#00B8A3" />
            <StatRow label="Medium" value={stats?.leetcode?.medium || 0} total={3000} color="#FFC01E" />
            <StatRow label="Hard" value={stats?.leetcode?.hard || 0} total={3000} color="#FF375F" />
          </div>
        </div>

        {/* Platform Comparison */}
        <div className="bg-[#050505] border border-white/10 p-5 rounded-xl">
          <h4 className="text-[#E50914] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <BarChart3 size={14} /> Accuracy Report
          </h4>
          <div className="flex items-center justify-center h-40 border border-dashed border-white/5 rounded-lg">
            <span className="text-gray-600 text-[10px] uppercase font-black tracking-[0.2em]">Radar Mapping Inactive</span>
          </div>
        </div>
      </div>

      <div className="bg-[#050505] border border-white/10 p-5 rounded-xl">
        <h4 className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">Submission Velocity (30 Days)</h4>
        <div className="h-32 flex items-end gap-1 px-2">
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 bg-[#E50914]/20 hover:bg-[#E50914] transition-all rounded-t-sm cursor-help"
              style={{ height: `${Math.random() * 100}%` }}
              title={`Day ${i+1}: ${Math.floor(Math.random()*10)} solved`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value, total, color }: any) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <div 
        className="h-full transition-all duration-1000" 
        style={{ width: `${(value / total) * 1000}%`, backgroundColor: color }}
      ></div>
    </div>
  </div>
);

export default Analytics;
