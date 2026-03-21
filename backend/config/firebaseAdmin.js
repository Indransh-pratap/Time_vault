const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Guard against re-initialization (e.g., hot-reload in development)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Export as named export to match: const { admin } = require('./firebaseAdmin')
module.exports = { admin };