const User = require('../models/User');

const syncUser = async (req, res) => {
  try {
    const { name, email, uid, picture, firebase } = req.user;
    
    let user = await User.findOne({ firebaseUid: uid });
    
    if (user) {
      return res.status(200).json(user);
    }
    
    const provider = firebase?.sign_in_provider || 'unknown';

    user = await User.create({
      name: name || email.split('@')[0],
      email: email,
      firebaseUid: uid,
      image: picture || '',
      provider: provider
    });
    
    res.status(201).json(user);
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { syncUser };
