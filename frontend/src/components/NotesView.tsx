import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Youtube, FileText, X, Save, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

// ─── Types & helpers ──────────────────────────────────────────────────────────

interface Note {
  _id: string;
  title: string;
  content: string;
  type: 'text' | 'youtube';
  createdAt: string;
  updatedAt: string;
}

const YT_REGEX = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

const extractYTId = (content: string): string | null => {
  const m = content.match(YT_REGEX);
  return m ? m[1] : null;
};

const lsDraftKey = (id: string) => `tv_note_draft_${id}`;

// ─── Note Card ────────────────────────────────────────────────────────────────

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

// ─── Main NotesView Component ─────────────────────────────────────────────────

export default function NotesView() {
  const [notes,   setNotes]   = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Note | null>(null);
  const [adding,  setAdding]  = useState(false);
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

  // Create
  const handleCreate = async () => {
    setAdding(true);
    try {
      const { data: newNote } = await api.post<Note>('/notes', { title: 'Untitled', content: '' });
      setNotes((prev) => [newNote, ...prev]);
      setEditing(newNote);
      socket?.emit('note:update', { action: 'created', note: newNote });
    } catch {
      toast.error('Failed to create note');
    } finally {
      setAdding(false);
    }
  };

  // Save
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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white font-mono">Notes</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            {notes.length} note{notes.length !== 1 ? 's' : ''} · Text &amp; YouTube
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleCreate}
          disabled={adding}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#E50914] text-white font-mono uppercase tracking-widest text-sm font-bold hover:bg-[#c20812] disabled:opacity-50 transition-all rounded-lg shadow-[0_0_20px_rgba(229,9,20,0.3)] hover:shadow-[0_0_30px_rgba(229,9,20,0.5)]"
        >
          <Plus size={16} /> {adding ? 'Creating…' : 'New Note'}
        </motion.button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-white/3 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <FileText size={44} className="text-gray-700" />
          <p className="text-gray-600 font-mono text-sm uppercase tracking-widest">No notes yet</p>
          <p className="text-gray-700 font-mono text-xs">Click "New Note" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {notes.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                onClick={() => setEditing(note)}
                onDelete={() => handleDelete(note)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {editing && (
          <NoteEditor
            key={editing._id}
            note={editing}
            onClose={() => setEditing(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
