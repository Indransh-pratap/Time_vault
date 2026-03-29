const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { admin } = require('../config/firebaseAdmin');

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      // Removed duplicate logging for clean console
      return res.status(401).json({ message: "No token provided" });
    }

    // Try verifying as Custom JWT first (for standard API calls)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ [Auth] Custom JWT Decoded:", decoded);

      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        console.log("❌ [Auth] User not found in DB for custom JWT");
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      return next();
    } catch (jwtErr) {
      // If custom JWT fails, try Firebase (for the initial sync-user call)
      try {
        const decodedFirebase = await admin.auth().verifyIdToken(token);
        console.log("✅ [Auth] Firebase Token Verified:", decodedFirebase.email);
        
        // Populate req.user with firebase info so sync-user can use it
        req.user = decodedFirebase; 
        return next();
      } catch (firebaseErr) {
        console.error("🔥 [Auth] Authentication failed for both JWT and Firebase");
        return res.status(401).json({ message: "Token invalid or expired" });
      }
    }
  } catch (error) {
    console.error("🔥 [Auth] Unexpected error:", error.message);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

module.exports = { protect };