import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, githubProvider } from "../firebase";
import { 
  signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser,
  fetchSignInMethodsForEmail,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential, updatePassword,
  GoogleAuthProvider, GithubAuthProvider, AuthCredential
} from "firebase/auth";
import api from "../lib/api";
import { toast } from "react-hot-toast";

export interface MongoUser {
  _id: string;
  name: string;
  email: string;
  image: string;
  subscription: {
    status: 'free' | 'pro';
  };
}

export interface LinkingState {
  needsLinking: boolean;
  email?: string;
  methods?: string[];
  pendingCredential?: AuthCredential | null;
}

interface AuthContextType {
  user: FirebaseUser | null;
  mongoUser: MongoUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<LinkingState | { success: true }>;
  signInWithGithub: () => Promise<LinkingState | { success: true }>;
  signInWithEmailPass: (e: string, p: string) => Promise<any>;
  signUpWithEmailPass: (e: string, p: string) => Promise<any>;
  sendMagicLink: (email: string) => Promise<any>;
  completeMagicLink: (url: string) => Promise<any>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [mongoUser, setMongoUser] = useState<MongoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const fbToken = await currentUser.getIdToken();
          const { data } = await api.post('/auth/sync-user', {}, {
            headers: { Authorization: `Bearer ${fbToken}` }
          });
          if (data.token) {
            localStorage.setItem('token', data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          }
          setMongoUser(data.user);
        } catch (error) {
          console.error("Failed to sync user with MongoDB", error);
          toast.error("Account verification failed");
          setMongoUser(null);
        }
      } else {
        setMongoUser(null);
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleAuthWithLinking = async (providerLoginFn: () => Promise<any>, providerName: string) => {
    try {
      await providerLoginFn();
      toast.success(`Identity Verified via ${providerName}`);
      return { success: true as const };
    } catch (error: any) {
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        let pendingCredential = null;
        
        if (providerName === 'Google') {
           pendingCredential = GoogleAuthProvider.credentialFromError(error);
        } else if (providerName === 'GitHub') {
           pendingCredential = GithubAuthProvider.credentialFromError(error);
        }

        if (email && pendingCredential) {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          return { needsLinking: true, email, methods, pendingCredential };
        }
      }
      toast.error(error.message || `${providerName} Authentication Failed`);
      throw error;
    }
  };

  const signInWithGoogle = () => handleAuthWithLinking(() => signInWithPopup(auth, googleProvider), 'Google');
  const signInWithGithub = () => handleAuthWithLinking(() => signInWithPopup(auth, githubProvider), 'GitHub');

  const signUpWithEmailPass = async (email: string, pass: string) => {
    try {
      console.log("Email:", email);
      console.log("Password length:", pass.length);
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        throw { code: "custom/account-exists", message: "Account already exists. Please login instead." };
      }
      return await createUserWithEmailAndPassword(auth, email, pass);
    } catch (e: any) {
      console.log("Auth Error Code:", e.code);
      console.log("Auth Error Message:", e.message);
      throw e;
    }
  };

  const signInWithEmailPass = async (email: string, pass: string) => {
    try {
      console.log("Email:", email);
      console.log("Password length:", pass.length);
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length === 0) {
        throw { code: "auth/user-not-found", message: "No account found. Please register first." };
      }
      return await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: any) {
      console.log("Auth Error Code:", e.code);
      console.log("Auth Error Message:", e.message);
      throw e;
    }
  };

  const sendMagicLink = async (email: string) => {
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      localStorage.setItem("emailForSignIn", email);
      toast.success("Magic link sent to email!");
      return true;
    } catch (e: any) {
      toast.error(e.message);
      throw e;
    }
  };

  const completeMagicLink = async (url: string) => {
    if (isSignInWithEmailLink(auth, url)) {
      let email = localStorage.getItem("emailForSignIn");
      if (!email) {
        email = window.prompt("Please provide your email for confirmation");
      }
      if (email) {
        try {
          const res = await signInWithEmailLink(auth, email, url);
          localStorage.removeItem("emailForSignIn");
          toast.success("Identity verified via Magic Link");
          return res;
        } catch (e: any) {
          toast.error("Invalid or expired magic link");
          throw e;
        }
      }
    }
  };

  const resetPassword = async (email: string) => {
    if (!email) {
      toast.error("Please enter your email to reset password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found for this email.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address format.');
      } else {
        toast.error('Failed to send reset email: ' + error.message);
      }
      throw error;
    }
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        throw new Error("User not logged in or email unavailable.");
      }
      if (newPass.length < 6) {
        throw new Error("New password must be at least 6 characters.");
      }
      
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
      
      // Re-authenticate
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Change Password
      await updatePassword(auth.currentUser, newPass);
      toast.success("Password updated successfully.");
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        toast.error("Incorrect current password.");
      } else if (error.code === 'auth/weak-password') {
        toast.error("New password is too weak (min 6 characters).");
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error("Security requirement: Please log out and log back in to change password.");
      } else {
        toast.error(error.message || "Failed to change password.");
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setMongoUser(null);
      localStorage.removeItem('token');
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error("Failed to terminate session");
    }
  };

  return (
    <AuthContext.Provider value={{
      user, mongoUser, loading,
      signInWithGoogle, signInWithGithub,
      signInWithEmailPass, signUpWithEmailPass,
      sendMagicLink, completeMagicLink,
      resetPassword, changePassword,
      logout
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
