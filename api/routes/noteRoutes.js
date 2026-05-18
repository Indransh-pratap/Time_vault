const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { getNotes, createNote, uploadPdfNote, updateNote, deleteNote } = require('../controllers/noteController');
const { protect } = require('../middleware/auth');

// Multer — memory storage, 50MB limit, PDF only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },            // 50 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

router.use(protect);

router.get('/',           getNotes);
router.post('/',          createNote);
router.post('/upload-pdf', upload.single('pdf'), uploadPdfNote);
router.put('/:id',        updateNote);
router.delete('/:id',     deleteNote);

module.exports = router;
