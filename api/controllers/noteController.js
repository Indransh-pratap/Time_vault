const Note = require('../models/Note');
const cloudinary = require('cloudinary').v2;

// ── Cloudinary Config ──────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// ── Helpers ────────────────────────────────────────────────────────────────

/** Detect if any line in the content is a YouTube URL and set type accordingly */
function detectNoteType(content = '') {
  const ytRegex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  return ytRegex.test(content) ? 'youtube' : 'text';
}

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB

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

// ── PDF Upload ─────────────────────────────────────────────────────────────

const uploadPdfNote = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate MIME type
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ message: 'Only PDF files are allowed' });
    }

    // Validate size
    if (file.size > MAX_PDF_SIZE) {
      return res.status(400).json({ message: 'File size exceeds 50MB limit' });
    }

    const title = req.body.title || file.originalname.replace(/\.pdf$/i, '') || 'Untitled PDF';

    // Upload to Cloudinary as raw resource
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'timevault_pdfs',
          resource_type: 'raw',
          public_id: `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`,
          format: 'pdf',
          type: 'upload',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    console.log('[Cloudinary Upload] PDF Success:', {
      resource_type: result.resource_type,
      secure_url: result.secure_url,
      type: result.type
    });

    // Create note in DB
    const note = await Note.create({
      userId:       req.user.uid,
      title,
      content:      '',
      type:         'pdf',
      fileUrl:      result.secure_url,
      fileName:     file.originalname,
      fileSize:     file.size,
      cloudinaryId: result.public_id,
    });

    const io = req.app.get('io');
    io.emit('note:sync', { action: 'created', note });

    res.status(201).json(note);
  } catch (err) {
    console.error('[noteController] uploadPdfNote:', err);
    res.status(500).json({ message: 'PDF upload failed' });
  }
};

// ── Update ─────────────────────────────────────────────────────────────────

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

// ── Delete (handles Cloudinary cleanup for PDFs) ───────────────────────────

const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    // If it's a PDF, remove the file from Cloudinary
    if (note.type === 'pdf' && note.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(note.cloudinaryId, { resource_type: 'raw' });
      } catch (cloudErr) {
        console.error('[noteController] Cloudinary delete error:', cloudErr);
        // Don't block note deletion if Cloudinary fails
      }
    }

    const io = req.app.get('io');
    io.emit('note:sync', { action: 'deleted', noteId: req.params.id });

    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error('[noteController] deleteNote:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getNotes, createNote, uploadPdfNote, updateNote, deleteNote };
