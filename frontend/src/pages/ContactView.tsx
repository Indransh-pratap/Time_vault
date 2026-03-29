import { useState } from 'react';
import { Mail, Github, Twitter, Linkedin, Send, MessageSquare, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ContactView() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/contact', formData);
      toast.success('Message sent! I\'ll get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const socials = [
    { icon: <Github size={20} />, label: 'GitHub',   href: 'https://github.com/indransh', color: '#fff' },
    { icon: <Twitter size={20} />, label: 'Twitter',  href: 'https://twitter.com/indransh', color: '#1DA1F2' },
    { icon: <Linkedin size={20} />, label: 'LinkedIn', href: 'https://linkedin.com/in/indransh', color: '#0077b5' },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono uppercase tracking-[0.2em]"
          >
            <Terminal size={12} /> Developer Portal
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter font-mono italic">
            Get in <span className="text-red-600">Touch</span>
          </h1>
          <p className="text-gray-500 font-mono text-sm max-w-lg mx-auto leading-relaxed">
            Have a feature request, bug report, or just want to say hi? 
            Drop a message below and I'll respond as soon as the code compiles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Social Links */}
          <div className="space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-[0.3em] text-gray-700">Connect</h3>
            <div className="space-y-3">
              {socials.map((s) => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ x: 5 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div className="text-gray-500 group-hover:text-white transition-colors" style={{ color: s.color }}>
                    {s.icon}
                  </div>
                  <span className="text-sm font-mono text-gray-400 group-hover:text-white transition-colors">{s.label}</span>
                </motion.a>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-gradient-to-br from-red-600/5 to-transparent border border-white/5 space-y-3">
              <div className="flex items-center gap-2 text-red-500">
                <Mail size={16} />
                <span className="text-xs font-mono font-bold uppercase tracking-widest">Direct Mail</span>
              </div>
              <p className="text-xs text-gray-600 font-mono">indransh@timevault.app</p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2">
            <div className="glass-card border border-white/10 p-8 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <MessageSquare size={120} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest ml-1">Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Indransh Thakur"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-red-600 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest ml-1">Email</label>
                    <input
                      required
                      type="email"
                      placeholder="indransh@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-red-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest ml-1">Subject</label>
                  <input
                    type="text"
                    placeholder="Feature Request: Dark Mode++"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-red-600 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest ml-1">Message</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell me what's on your mind..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-red-600 transition-all resize-none"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className="w-full py-4 bg-red-600 text-white font-mono font-bold uppercase tracking-[0.3em] rounded-xl flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(229,9,20,0.3)] disabled:opacity-50"
                >
                  {loading ? 'Transmitting...' : (
                    <>
                      <Send size={18} />
                      Send Message
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pt-8 border-t border-white/5 space-y-2">
          <p className="text-[10px] font-mono text-gray-700 uppercase tracking-widest">TimeVault HQ © 2026</p>
          <div className="flex items-center justify-center gap-4 text-gray-800">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
            <span className="text-[9px] font-mono uppercase">Systems Optimal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
