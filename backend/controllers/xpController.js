const XP = require('../models/XP');

// ── Level formula: floor(sqrt(totalXP / 10)) ──────────────────────────────

const calcLevel = (totalXP) => Math.floor(Math.sqrt(totalXP / 10));

// ── XP keyword detection ───────────────────────────────────────────────────

const XP_RULES = [
  { keywords: ['dsa', 'leetcode', 'algorithm', 'code', 'coding', 'programming', 'dev'], xp: 20 },
  { keywords: ['nofap', 'discipline', 'streak', 'clean'],                               xp: 40 },
  { keywords: ['gym', 'workout', 'exercise', 'lift', 'run', 'cardio', 'fitness'],       xp: 10 },
  { keywords: ['diet', 'nutrition', 'meal', 'fast', 'eat'],                             xp: 5  },
];

const getXPForTitle = (title = '') => {
  const lower = title.toLowerCase();
  for (const rule of XP_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) return rule.xp;
  }
  return 5; // default
};

// ── Internal helper: add XP, broadcast via socket ─────────────────────────

const addXPHelper = async (userId, amount, io) => {
  const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  let doc = await XP.findOne({ userId });

  if (!doc) {
    doc = new XP({ userId, totalXP: 0, dailyXP: 0, level: 0, dailyDate: today });
  }

  // Reset daily XP if it's a new day
  if (doc.dailyDate !== today) {
    doc.dailyXP   = 0;
    doc.dailyDate = today;
  }

  doc.totalXP += amount;
  doc.dailyXP  = Math.min(doc.dailyXP + amount, 100); // daily cap
  doc.level    = calcLevel(doc.totalXP);

  await doc.save();

  // Real-time broadcast
  if (io) {
    io.emit('xp:sync', {
      totalXP: doc.totalXP,
      dailyXP: doc.dailyXP,
      level:   doc.level,
      gained:  amount,
    });
  }

  return doc;
};

// ── GET /api/xp — fetch or init user XP ──────────────────────────────────

const getXP = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let doc = await XP.findOne({ userId: req.user.uid });

    if (!doc) {
      doc = await XP.create({ userId: req.user.uid, dailyDate: today });
    } else if (doc.dailyDate !== today) {
      // Reset daily XP on new day
      doc.dailyXP   = 0;
      doc.dailyDate = today;
      await doc.save();
    }

    res.json({
      totalXP: doc.totalXP,
      dailyXP: doc.dailyXP,
      level:   doc.level,
      streak:  doc.streak,
    });
  } catch (err) {
    console.error('[xpController] getXP:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── POST /api/xp/award — award XP for a completed task ───────────────────

const awardTaskXP = async (req, res) => {
  try {
    const { taskTitle } = req.body;
    const amount = getXPForTitle(taskTitle);
    const io     = req.app.get('io');
    const doc    = await addXPHelper(req.user.uid, amount, io);

    res.json({
      gained:  amount,
      totalXP: doc.totalXP,
      dailyXP: doc.dailyXP,
      level:   doc.level,
    });
  } catch (err) {
    console.error('[xpController] awardTaskXP:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getXP, awardTaskXP, getXPForTitle };
