const Note = require('../models/Note');

// ── Helpers ────────────────────────────────────────────────────────────────

/** Detect if any line in the content is a YouTube URL and set type accordingly */
function detectNoteType(content = '') {
  const ytRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  return ytRegex.test(content) ? 'youtube' : 'text';
}

// ── Controllers ────────────────────────────────────────────────────────────

const getNotes = async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.uid }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (err) {
    console.error('[noteController] getNotes:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const createNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    const type = detectNoteType(content);

    const note = await Note.create({
      userId: req.user.uid,
      title:   title   || 'Untitled',
      content: content || '',
      type,
    });

    const io = req.app.get('io');
    io.emit('note:sync', { action: 'created', note });

    res.status(201).json(note);
  } catch (err) {
    console.error('[noteController] createNote:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateNote = async (req, res) => {
  try {
    const { title, content } = req.body;
    const type = detectNoteType(content);

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid },
      { title, content, type },
      { new: true }
    );

    if (!note) return res.status(404).json({ message: 'Note not found' });

    const io = req.app.get('io');
    io.emit('note:sync', { action: 'updated', note });

    res.json(note);
  } catch (err) {
    console.error('[noteController] updateNote:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const io = req.app.get('io');
    io.emit('note:sync', { action: 'deleted', noteId: req.params.id });

    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('[noteController] deleteNote:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getNotes, createNote, updateNote, deleteNote };
