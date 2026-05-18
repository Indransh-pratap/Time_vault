const axios = require('axios');
const CodingProfile = require('../models/CodingProfile');
const CodingStats = require('../models/CodingStats');
const Contest = require('../models/Contest');
const CodingGoal = require('../models/CodingGoal');
const CodingSession = require('../models/CodingSession');
const DailySnapshot = require('../models/DailySnapshot');
const PlatformStreak = require('../models/PlatformStreak');
const XP = require('../models/XP');

// Helper to fetch LC stats
const fetchLeetCode = async (username) => {
  if (!username) return null;
  try {
    const { data } = await axios.get(`https://leetcode-stats-api.herokuapp.com/${username}`);
    if (data.status === 'error') return null;
    return {
      totalSolved: data.totalSolved,
      easy: data.easySolved,
      medium: data.mediumSolved,
      hard: data.hardSolved,
      rating: 0 // LeetCode rating usually requires a different API or GraphQL
    };
  } catch (err) {
    console.error(`LeetCode fetch failed for ${username}:`, err.message);
    return null;
  }
};

// Helper to fetch CF stats
const fetchCodeforces = async (handle) => {
  if (!handle) return null;
  try {
    const { data } = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
    if (data.status !== 'OK') return null;
    const user = data.result[0];
    return {
      rating: user.rating || 0,
      maxRating: user.maxRating || 0,
      rank: user.rank || 'unrated',
      solvedCount: 0 // CF needs user.status for solved count, but we'll stick to basic info for now
    };
  } catch (err) {
    console.error(`Codeforces fetch failed for ${handle}:`, err.message);
    return null;
  }
};

// Helper to fetch CC stats
const fetchCodeChef = async (username) => {
  if (!username) return null;
  try {
    // Note: Public APIs for CodeChef are unstable, this is a placeholder
    const { data } = await axios.get(`https://codechef-api.vercel.app/${username}`);
    return {
      rating: data.currentRating || 0,
      stars: data.stars || '0',
      solvedCount: data.fullySolved?.count || 0
    };
  } catch (err) {
    console.error(`CodeChef fetch failed for ${username}:`, err.message);
    return null;
  }
};

exports.getProfile = async (req, res) => {
  try {
    let profile = await CodingProfile.findOne({ userId: req.user.id });
    if (!profile) {
      profile = await CodingProfile.create({ userId: req.user.id });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const profile = await CodingProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: req.body },
      { new: true, upsert: true }
    );
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.syncProfile = async (req, res) => {
  const userId = req.user.id;
  try {
    const profile = await CodingProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    profile.syncStatus = 'syncing';
    await profile.save();

    const [lc, cf, cc] = await Promise.all([
      fetchLeetCode(profile.leetcodeUsername),
      fetchCodeforces(profile.codeforcesHandle),
      fetchCodeChef(profile.codechefUsername)
    ]);

    const stats = await CodingStats.findOneAndUpdate(
      { userId },
      {
        $set: {
          leetcode: lc || {},
          codeforces: cf || {},
          codechef: cc || {},
          lastFetched: new Date()
        }
      },
      { new: true, upsert: true }
    );

    // Update daily snapshot
    const todayStr = new Date().toISOString().split('T')[0];
    const totalSolved = (lc?.totalSolved || 0) + (cf?.solvedCount || 0) + (cc?.solvedCount || 0);
    
    await DailySnapshot.findOneAndUpdate(
      { userId, date: todayStr },
      {
        $set: {
          leetcodeSolved: lc?.totalSolved || 0,
          codeforcesSolved: cf?.solvedCount || 0,
          codechefSolved: cc?.solvedCount || 0,
          totalSolved
        }
      },
      { upsert: true }
    );

    profile.totalSolved = totalSolved;
    profile.syncStatus = 'idle';
    profile.lastUpdated = new Date();
    await profile.save();

    res.json({ profile, stats });
  } catch (err) {
    await CodingProfile.findOneAndUpdate({ userId: req.user.id }, { syncStatus: 'error' });
    res.status(500).json({ error: err.message });
  }
};

exports.getContests = async (req, res) => {
  try {
    // Try to fetch from external API
    const { data } = await axios.get('https://kontests.net/api/v1/all');
    
    // Filter for platforms we care about
    const filtered = data.filter(c => 
      ['LeetCode', 'CodeForces', 'CodeChef', 'AtCoder'].includes(c.site)
    ).map(c => ({
      name: c.name,
      platform: c.site,
      startTime: new Date(c.start_time),
      duration: parseInt(c.duration),
      link: c.url,
      externalId: `${c.site}-${c.name}-${c.start_time}`
    }));

    // Update local cache if needed (optional, but good for stability)
    // For now, just return the filtered list
    res.json(filtered);
  } catch (err) {
    console.error('Contest fetch failed:', err.message);
    const localContests = await Contest.find({ startTime: { $gte: new Date() } }).sort({ startTime: 1 });
    res.json(localContests);
  }
};

exports.getGoals = async (req, res) => {
  try {
    const goals = await CodingGoal.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const goal = await CodingGoal.create({ ...req.body, userId: req.user.id });
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const goal = await CodingGoal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    await CodingGoal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const sessions = await CodingSession.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSession = async (req, res) => {
  try {
    const session = await CodingSession.create({ ...req.body, userId: req.user.id });
    
    // Award XP if solved
    if (req.body.status === 'Solved') {
      const xpAmount = req.body.difficulty === 'Hard' ? 20 : req.body.difficulty === 'Medium' ? 10 : 5;
      await XP.findOneAndUpdate(
        { userId: req.user.id },
        { $inc: { totalXP: xpAmount } },
        { upsert: true }
      );
    }

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const snapshots = await DailySnapshot.find({ userId: req.user.id })
      .sort({ date: 1 })
      .limit(30);
    const stats = await CodingStats.findOne({ userId: req.user.id });
    res.json({ snapshots, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
