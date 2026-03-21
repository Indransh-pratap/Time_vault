import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDbNyXZkfLVVt6qxAfjuUTzl_pa7Z7nU0o",
  authDomain: "timevalut-2c722.firebaseapp.com",
  projectId: "timevalut-2c722",
  storageBucket: "timevalut-2c722.firebasestorage.app",
  messagingSenderId: "507581087355",
  appId: "1:507581087355:web:3628df3c2eb203433dacde",
  measurementId: "G-KS05K2Z9LB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
