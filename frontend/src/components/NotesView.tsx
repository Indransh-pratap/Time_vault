import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Trash2, Youtube, FileText, X, Save, CheckCircle2, Circle,
  Search, Upload, File, Download, Eye, AlertCircle, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

// ─── Types & helpers ──────────────────────────────────────────────────────────

interface Note {
  _id: string;
  title: string;
  content: string;
  type: 'text' | 'youtube' | 'pdf';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

type FilterType = 'all' | 'text' | 'youtube' | 'pdf';
type CreateMode = 'text' | 'youtube' | 'pdf';

const YT_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

const extractYTId = (content: string): string | null => {
  const m = content.match(YT_REGEX);
  return m ? m[1] : null;
};

const lsDraftKey = (id: string) => `tv_note_draft_${id}`;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// ─── PDF Note Card ────────────────────────────────────────────────────────────

function PdfNoteCard({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.fileUrl) window.open(note.fileUrl, '_blank');
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.fileUrl) {
      const a = document.createElement('a');
      a.href = note.fileUrl;
      a.download = note.fileName || 'document.pdf';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="glass-card group relative border border-white/5 hover:border-[#E50914]/30 hover:shadow-[0_0_25px_rgba(229,9,20,0.08)] transition-all duration-300 overflow-hidden rounded-lg"
    >
      {/* PDF Header Banner */}
      <div className="relative w-full h-32 bg-gradient-to-br from-[#1a0505] via-[#2a0a0a] to-[#0d0d0d] flex items-center justify-center overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(229,9,20,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(229,9,20,0.3) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative flex flex-col items-center gap-2 z-10">
          <div className="w-14 h-14 rounded-xl bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.2)]">
            <File size={26} className="text-[#E50914]" />
          </div>
          <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-[#E50914]/60">PDF Document</span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Type badge + size */}
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm bg-[#E50914]/10 text-[#E50914] border border-[#E50914]/20">
            <File size={9} />
            PDF
          </span>
          <span className="text-[9px] font-mono text-gray-600">
            {note.fileSize ? formatFileSize(note.fileSize) : '—'}
          </span>
        </div>

        <h3 className="font-mono font-bold text-sm text-white truncate tracking-wide">
          {note.title || note.fileName || 'Untitled PDF'}
        </h3>

        <p className="text-[10px] text-gray-600 font-mono truncate">
          {note.fileName || 'document.pdf'}
        </p>

        {/* Date */}
        <div className="text-[9px] font-mono text-gray-700">
          {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handlePreview}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all text-[10px] font-mono uppercase tracking-widest"
          >
            <Eye size={11} />
            Preview
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-white/[0.03] border border-white/10 text-gray-400 hover:text-[#45A29E] hover:border-[#45A29E]/30 hover:bg-[#45A29E]/5 transition-all text-[10px] font-mono uppercase tracking-widest"
          >
            <Download size={11} />
            Download
          </button>
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-black/70 border border-red-900/50 text-gray-500 hover:text-red-400 hover:border-red-500 rounded-sm transition-all"
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}

// ─── Text/YouTube Note Card ───────────────────────────────────────────────────

function NoteCard({ note, onClick, onDelete }: { note: Note; onClick: () => void; onDelete: () => void }) {
  const ytId = note.type === 'youtube' ? extractYTId(note.content) : null;
  const preview = note.content.replace(/https?:\/\/\S+/g, '').trim().slice(0, 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="glass-card group relative cursor-pointer border border-white/5 hover:border-[#E50914]/30 hover:shadow-[0_0_25px_rgba(229,9,20,0.08)] transition-all duration-300 overflow-hidden rounded-lg"
      onClick={onClick}
    >
      {/* YouTube thumbnail */}
      {ytId && (
        <div className="relative w-full aspect-video overflow-hidden bg-black">
          <img
            src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
            alt="YouTube thumbnail"
            className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
              <div className="w-0 h-0 border-t-[8px] border-b-[8px] border-l-[14px] border-t-transparent border-b-transparent border-l-white ml-1" />
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-2">
        {/* Type badge */}
        <div className="flex items-center justify-between gap-2">
          <span className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-sm ${
            note.type === 'youtube'
              ? 'bg-red-900/40 text-red-400 border border-red-800/40'
              : 'bg-white/5 text-gray-500 border border-white/10'
          }`}>
            {note.type === 'youtube' ? <Youtube size={9} /> : <FileText size={9} />}
            {note.type === 'youtube' ? 'YouTube' : 'Note'}
          </span>
          <span className="text-[9px] font-mono text-gray-700">
            {new Date(note.updatedAt).toLocaleDateString()}
          </span>
        </div>

        <h3 className="font-mono font-bold text-sm text-white truncate tracking-wide">
          {note.title || 'Untitled'}
        </h3>

        {preview && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 font-mono">
            {preview || '—'}
          </p>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 bg-black/70 border border-red-900/50 text-gray-500 hover:text-red-400 hover:border-red-500 rounded-sm transition-all"
      >
        <Trash2 size={12} />
      </button>
    </motion.div>
  );
}

// ─── Note Editor Modal ────────────────────────────────────────────────────────

function NoteEditor({
  note,
  onClose,
  onSave,
}: {
  note: Note;
  onClose: () => void;
  onSave: (id: string, title: string, content: string) => Promise<void>;
}) {
  const draftKey = lsDraftKey(note._id);

  // Restore from localStorage draft if available
  const storedDraft = (() => {
    try { return JSON.parse(localStorage.getItem(draftKey) || 'null'); } catch { return null; }
  })();

  const [title,   setTitle]   = useState<string>(storedDraft?.title   ?? note.title);
  const [content, setContent] = useState<string>(storedDraft?.content ?? note.content);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [dirty,   setDirty]   = useState(!!storedDraft);

  const ytId = extractYTId(content);

  // Draft recovery toast
  useEffect(() => {
    if (storedDraft) {
      toast('Draft recovered — unsaved changes restored', {
        icon: '📝',
        style: { background: '#1a1a1a', color: '#ccc', border: '1px solid #333', fontFamily: 'monospace', fontSize: '12px' },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft to localStorage (instant persistence)
  const persistDraft = useCallback((t: string, c: string) => {
    localStorage.setItem(draftKey, JSON.stringify({ title: t, content: c }));
  }, [draftKey]);

  const handleTitleChange = (v: string) => {
    setTitle(v); setDirty(true); setSaved(false);
    persistDraft(v, content);
  };
  const handleContentChange = (v: string) => {
    setContent(v); setDirty(true); setSaved(false);
    persistDraft(title, v);
  };

  // Manual Save — primary sync mechanism
  const handleManualSave = async () => {
    setSaving(true);
    try {
      await onSave(note._id, title, content);
      localStorage.removeItem(draftKey);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success('Note synced to TimeVault');
    } catch {
      toast.error('Sync failed — draft preserved locally');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
        className="w-full max-w-2xl max-h-[85vh] flex flex-col glass-card border border-white/10 rounded-xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
            {ytId ? <Youtube size={12} className="text-red-400" /> : <FileText size={12} />}
            Note Editor
          </div>
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            {saving && (
              <span className="text-[10px] font-mono text-[#45A29E] flex items-center gap-1">
                <Save size={10} className="animate-spin" /> Syncing…
              </span>
            )}
            {!saving && saved && (
              <span className="text-[10px] font-mono text-green-500 flex items-center gap-1">
                <CheckCircle2 size={10} /> Synced
              </span>
            )}
            {!saving && !saved && dirty && (
              <span className="text-[10px] font-mono text-amber-500/80 flex items-center gap-1">
                <Circle size={8} className="fill-amber-500/80" /> Unsynced
              </span>
            )}

            {/* Manual Save button */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleManualSave}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs uppercase tracking-widest font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: dirty ? 'rgba(229,9,20,0.12)' : 'rgba(255,255,255,0.04)',
                border: dirty ? '1px solid rgba(229,9,20,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: dirty ? '#E50914' : '#4B5563',
              }}
            >
              <Save size={12} />
              Save
            </motion.button>

            <button onClick={onClose} className="p-1.5 text-gray-600 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title…"
          className="px-5 py-3 bg-transparent text-white font-bold font-mono text-lg tracking-wide border-b border-white/5 focus:outline-none placeholder-gray-700"
        />

        {/* YouTube embed preview */}
        {ytId && (
          <div className="mx-5 mt-3 rounded-lg overflow-hidden border border-red-900/30 flex-shrink-0">
            <iframe
              width="100%"
              height="220"
              src={`https://www.youtube.com/embed/${ytId}`}
              title="YouTube preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="block"
            />
          </div>
        )}

        {/* Content */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start typing… Paste a YouTube URL to embed it."
          className="flex-1 px-5 py-4 bg-transparent text-gray-300 font-mono text-sm leading-relaxed focus:outline-none resize-none placeholder-gray-700 min-h-[150px]"
        />

        <div className="px-5 py-3 border-t border-white/5 text-[10px] font-mono text-gray-700 flex items-center justify-between">
          <span>Drafts auto-saved locally · Use "Save" to sync to cloud</span>
          <span>Manual sync only</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Create Note Modal ────────────────────────────────────────────────────────

function CreateNoteModal({
  onClose,
  onCreateText,
  onUploadPdf,
}: {
  onClose: () => void;
  onCreateText: (title: string, content: string) => Promise<void>;
  onUploadPdf: (file: File, title: string) => Promise<void>;
}) {
  const [mode, setMode]             = useState<CreateMode>('text');
  const [title, setTitle]           = useState('');
  const [content, setContent]       = useState('');
  const [pdfFile, setPdfFile]       = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver]     = useState(false);
  const [error, setError]           = useState('');
  const fileInputRef                = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 50 * 1024 * 1024;

  // Listen for progress events from the upload handler
  useEffect(() => {
    const handler = (e: Event) => {
      const pct = (e as CustomEvent<number>).detail;
      setUploadProgress(pct);
    };
    window.addEventListener('pdf-upload-progress', handler);
    return () => window.removeEventListener('pdf-upload-progress', handler);
  }, []);

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') return 'Only PDF files are allowed';
    if (file.size > MAX_SIZE) return 'File size exceeds 50MB limit';
    return null;
  };

  const handleFileSelect = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      setPdfFile(null);
      return;
    }
    setError('');
    setPdfFile(file);
    if (!title) setTitle(file.name.replace(/\.pdf$/i, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (mode === 'pdf') {
      if (!pdfFile) {
        setError('Please select a PDF file');
        return;
      }
      setUploading(true);
      setUploadProgress(0);
      try {
        // We pass progress tracking via a custom approach
        await onUploadPdf(pdfFile, title || pdfFile.name.replace(/\.pdf$/i, ''));
        onClose();
      } catch {
        setError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
      }
    } else {
      // text or youtube mode
      try {
        await onCreateText(title || 'Untitled', content);
        onClose();
      } catch {
        setError('Failed to create note');
      }
    }
  };

  const modes: { id: CreateMode; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'text',    label: 'Text Note',    icon: FileText, color: 'text-gray-400' },
    { id: 'youtube', label: 'YouTube Link', icon: Youtube,  color: 'text-red-400' },
    { id: 'pdf',     label: 'PDF Upload',   icon: File,     color: 'text-[#E50914]' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.93, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
        className="w-full max-w-lg flex flex-col glass-card border border-white/10 rounded-xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-sm font-mono text-white uppercase tracking-widest font-bold">
            <Plus size={14} className="text-[#E50914]" />
            New Note
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-600 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 px-5 pt-4 pb-2">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setError(''); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md font-mono text-[11px] uppercase tracking-widest transition-all ${
                mode === m.id
                  ? 'bg-[#E50914]/10 border border-[#E50914]/40 text-[#E50914] shadow-[0_0_12px_rgba(229,9,20,0.15)]'
                  : 'bg-white/[0.02] border border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
              }`}
            >
              <m.icon size={12} />
              {m.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'pdf' ? 'Auto-filled from filename…' : 'Note title…'}
              className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-md text-white font-mono text-sm focus:outline-none focus:border-[#E50914]/40 placeholder-gray-700 transition-colors"
            />
          </div>

          {/* Text/YouTube content */}
          {mode !== 'pdf' && (
            <div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1 block">
                {mode === 'youtube' ? 'Paste YouTube URL' : 'Content'}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={mode === 'youtube' ? 'https://youtube.com/watch?v=...' : 'Write your note here…'}
                className="w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-md text-white font-mono text-sm focus:outline-none focus:border-[#E50914]/40 placeholder-gray-700 transition-colors resize-none min-h-[100px]"
              />
            </div>
          )}

          {/* PDF Upload Zone */}
          {mode === 'pdf' && (
            <div>
              <label className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-1 block">Upload PDF</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full py-8 px-4 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center gap-3 ${
                  dragOver
                    ? 'border-[#E50914] bg-[#E50914]/10 shadow-[0_0_30px_rgba(229,9,20,0.15)]'
                    : pdfFile
                      ? 'border-[#45A29E]/50 bg-[#45A29E]/5'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                  className="hidden"
                />

                {pdfFile ? (
                  <>
                    <div className="w-12 h-12 rounded-lg bg-[#45A29E]/10 border border-[#45A29E]/30 flex items-center justify-center">
                      <CheckCircle2 size={22} className="text-[#45A29E]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-mono font-bold text-white truncate max-w-[280px]">{pdfFile.name}</p>
                      <p className="text-[10px] font-mono text-gray-500 mt-1">{formatFileSize(pdfFile.size)} · Click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
                      <Upload size={22} className="text-gray-500" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-mono text-gray-400">
                        <span className="text-[#E50914] font-bold">Click to browse</span> or drag & drop
                      </p>
                      <p className="text-[10px] font-mono text-gray-700 mt-1">PDF only · Max 50MB</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Uploading…</span>
                <span className="text-[10px] font-mono text-[#E50914] tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#E50914] to-[#ff6b35] rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-900/20 border border-red-900/30 text-red-400 text-xs font-mono"
            >
              <AlertCircle size={12} />
              {error}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-500 font-mono text-xs uppercase tracking-widest hover:text-white transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={uploading || (mode === 'pdf' && !pdfFile)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] text-white font-mono uppercase tracking-widest text-xs font-bold hover:bg-[#c20812] disabled:opacity-40 disabled:cursor-not-allowed transition-all rounded-md shadow-[0_0_20px_rgba(229,9,20,0.3)]"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Uploading…
              </>
            ) : mode === 'pdf' ? (
              <>
                <Upload size={14} />
                Upload PDF
              </>
            ) : (
              <>
                <Plus size={14} />
                Create Note
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main NotesView Component ─────────────────────────────────────────────────

export default function NotesView() {
  const [notes,       setNotes]       = useState<Note[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editing,     setEditing]     = useState<Note | null>(null);
  const [showCreate,  setShowCreate]  = useState(false);
  const [filter,      setFilter]      = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const socket = useSocket();

  // Fetch
  useEffect(() => {
    api.get<Note[]>('/notes')
      .then(({ data }) => setNotes(data))
      .catch(() => toast.error('Failed to load notes'))
      .finally(() => setLoading(false));
  }, []);

  // Real-time sync
  useEffect(() => {
    if (!socket) return;
    const handleSync = (payload: { action: string; note?: Note; noteId?: string }) => {
      if (payload.action === 'created' && payload.note) {
        setNotes((prev) => {
          if (prev.find((n) => n._id === payload.note!._id)) return prev;
          return [payload.note!, ...prev];
        });
      } else if (payload.action === 'updated' && payload.note) {
        setNotes((prev) => prev.map((n) => n._id === payload.note!._id ? payload.note! : n));
        setEditing((prev) => prev && prev._id === payload.note!._id ? payload.note! : prev);
      } else if (payload.action === 'deleted' && payload.noteId) {
        setNotes((prev) => prev.filter((n) => n._id !== payload.noteId));
      }
    };
    socket.on('note:sync', handleSync);
    return () => { socket.off('note:sync', handleSync); };
  }, [socket]);

  // Create text/youtube note
  const handleCreateText = async (title: string, content: string) => {
    const { data: newNote } = await api.post<Note>('/notes', { title, content });
    setNotes((prev) => [newNote, ...prev]);
    socket?.emit('note:update', { action: 'created', note: newNote });
    toast.success('Note created');
  };

  // Upload PDF note
  const handleUploadPdf = async (file: File, title: string) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('title', title);

    const { data: newNote } = await api.post<Note>('/notes/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        // Progress is handled inside the modal via the event
        const total = progressEvent.total || file.size;
        const pct = Math.round((progressEvent.loaded * 100) / total);
        // Dispatch a custom event for the modal to pick up
        window.dispatchEvent(new CustomEvent('pdf-upload-progress', { detail: pct }));
      },
    });

    setNotes((prev) => [newNote, ...prev]);
    socket?.emit('note:update', { action: 'created', note: newNote });
    toast.success('PDF uploaded successfully');
  };

  // Save text/youtube note
  const handleSave = useCallback(async (id: string, title: string, content: string) => {
    const { data: updated } = await api.put<Note>(`/notes/${id}`, { title, content });
    setNotes((prev) => prev.map((n) => n._id === id ? updated : n));
    socket?.emit('note:update', { action: 'updated', note: updated });
  }, [socket]);

  // Delete
  const handleDelete = async (note: Note) => {
    setNotes((prev) => prev.filter((n) => n._id !== note._id));
    if (editing?._id === note._id) setEditing(null);
    try {
      await api.delete(`/notes/${note._id}`);
      socket?.emit('note:update', { action: 'deleted', noteId: note._id });
      toast.success('Note deleted');
    } catch {
      toast.error('Failed to delete note');
      setNotes((prev) => [note, ...prev]);
    }
  };

  // Filter & Search
  const filteredNotes = notes.filter((n) => {
    const matchesFilter = filter === 'all' || n.type === filter;
    const matchesSearch = !searchQuery || n.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const noteCount = {
    all: notes.length,
    text: notes.filter((n) => n.type === 'text').length,
    youtube: notes.filter((n) => n.type === 'youtube').length,
    pdf: notes.filter((n) => n.type === 'pdf').length,
  };

  const filters: { id: FilterType; label: string; icon: React.ElementType }[] = [
    { id: 'all',     label: 'All',     icon: FileText },
    { id: 'text',    label: 'Text',    icon: FileText },
    { id: 'youtube', label: 'YouTube', icon: Youtube },
    { id: 'pdf',     label: 'PDF',     icon: File },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white font-mono">Notes</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            {notes.length} note{notes.length !== 1 ? 's' : ''} · Text, YouTube &amp; PDF
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] text-white font-mono uppercase tracking-widest text-sm font-bold hover:bg-[#c20812] transition-all rounded-lg shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)]"
        >
          <Plus size={16} /> New Note
        </motion.button>
      </div>

      {/* Filter Bar + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-widest transition-all ${
                filter === f.id
                  ? 'bg-[#E50914]/10 border border-[#E50914]/40 text-[#E50914]'
                  : 'bg-white/[0.02] border border-white/5 text-gray-600 hover:text-gray-400 hover:border-white/10'
              }`}
            >
              <f.icon size={10} />
              {f.label}
              <span className={`ml-0.5 text-[9px] ${filter === f.id ? 'text-[#E50914]/60' : 'text-gray-700'}`}>
                {noteCount[f.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-700" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-8 pr-3 py-2 bg-white/[0.02] border border-white/5 rounded-md font-mono text-xs text-gray-400 focus:outline-none focus:border-[#E50914]/30 placeholder-gray-700 transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-white/3 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <FileText size={44} className="text-gray-700" />
          <p className="text-gray-600 font-mono text-sm uppercase tracking-widest">
            {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
          </p>
          <p className="text-gray-700 font-mono text-xs">
            {notes.length === 0 ? 'Click "New Note" to get started' : 'Try a different filter or search term'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredNotes.map((note) =>
              note.type === 'pdf' ? (
                <PdfNoteCard
                  key={note._id}
                  note={note}
                  onDelete={() => handleDelete(note)}
                />
              ) : (
                <NoteCard
                  key={note._id}
                  note={note}
                  onClick={() => setEditing(note)}
                  onDelete={() => handleDelete(note)}
                />
              )
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Editor Modal (for text/youtube notes) */}
      <AnimatePresence>
        {editing && editing.type !== 'pdf' && (
          <NoteEditor
            key={editing._id}
            note={editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* Create Note Modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateNoteModal
            onClose={() => setShowCreate(false)}
            onCreateText={handleCreateText}
            onUploadPdf={handleUploadPdf}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
