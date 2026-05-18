const User = require('../models/User');
const jwt = require('jsonwebtoken');

const syncUser = async (req, res) => {
  try {
    // req.user was populated by Firebase verifyIdToken in auth middleware
    const { name, email, uid, picture, firebase } = req.user;
    
    let user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      const provider = firebase?.sign_in_provider || 'unknown';
      user = await User.create({
        name: name || email.split('@')[0],
        email: email,
        firebaseUid: uid,
        image: picture || '',
        provider: provider
      });
    }

    // Generate Custom JWT for this MongoDB User
    const payload = { userId: user._id, email: user.email };
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing in environment variables");
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    res.status(200).json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        image: user.image,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { syncUser };
