import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, googleProvider, githubProvider } from "../firebase";
import { signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
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

interface AuthContextType {
  user: FirebaseUser | null;
  mongoUser: MongoUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
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
          // Force-refresh=false is fine; true would get a new token from Firebase servers
          const token = await currentUser.getIdToken(/* forceRefresh */ false);

          // Set as axios default so all subsequent requests are authenticated
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Pass the token explicitly here to avoid the race where the axios interceptor
          // reads auth.currentUser before Firebase SDK has fully updated it
          const res = await api.post('/auth/sync-user', {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMongoUser(res.data);
        } catch (error) {
          console.error("Failed to sync user with MongoDB", error);
          toast.error("Failed to sync profile data");
          setMongoUser(null);
        }
      } else {
        setMongoUser(null);
        delete api.defaults.headers.common['Authorization'];
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Successfully logged in with Google!");
    } catch (error: any) {
      toast.error(error.message || "Failed to log in");
    }
  };

  const signInWithGithub = async () => {
    try {
      await signInWithPopup(auth, githubProvider);
      toast.success("Successfully logged in with GitHub!");
    } catch (error: any) {
      toast.error(error.message || "Failed to log in");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setMongoUser(null);
      toast.success("Logged out successfully");
    } catch (error: any) {
      toast.error("Failed to log out");
    }
  };

  return (
    <AuthContext.Provider value={{ user, mongoUser, loading, signInWithGoogle, signInWithGithub, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
