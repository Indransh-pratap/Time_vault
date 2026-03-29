import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { linkWithCredential, AuthCredential } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Mail, Lock, Zap, ArrowRight, Github } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Login() {
  const { 
    user, mongoUser, loading, 
    signInWithGoogle, signInWithGithub, 
    signInWithEmailPass, signUpWithEmailPass,
    sendMagicLink, completeMagicLink, resetPassword
  } = useAuth();
  
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'magic'>('login');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Linking State
  const [pendingCred, setPendingCred] = useState<AuthCredential | null>(null);
  const [existingMethod, setExistingMethod] = useState<string>('');

  useEffect(() => {
    if (user && mongoUser && !pendingCred) {
      navigate('/dashboard');
    }
  }, [user, mongoUser, pendingCred, navigate]);

  useEffect(() => {
    const handleUrlAuth = async () => {
      if (window.location.href.includes('apiKey=')) {
        await completeMagicLink(window.location.href);
      }
    };
    handleUrlAuth();
  }, [completeMagicLink]);

  const handleProviderLogin = async (providerFn: () => Promise<any>) => {
    try {
      const res = await providerFn();
      if (res?.needsLinking) {
        setPendingCred(res.pendingCredential);
        setExistingMethod(res.methods?.[0] || 'Unknown');
        toast('Authentication halted. Please link your existing account first.', { icon: '⚠️' });
        return;
      }
      
      // If we successfully logged in AND have a pending credential, link it!
      if (res?.success && pendingCred && auth.currentUser) {
        await linkWithCredential(auth.currentUser, pendingCred);
        toast.success("Accounts successfully linked!");
        setPendingCred(null);
        navigate('/dashboard');
      }
    } catch (error) {
       // handled in context
    }
  };

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);

    try {
      if (!email || !email.includes("@") || !email.includes(".")) {
        throw new Error("Invalid email format");
      }
      
      if (mode !== 'magic') {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
      }

      if (mode === 'signup') {
         await signUpWithEmailPass(email, password);
      } else if (mode === 'login') {
         await signInWithEmailPass(email, password);
      } else if (mode === 'magic') {
         await sendMagicLink(email);
      }
    } catch (error: any) {
      console.log("Auth Error Code:", error.code);
      console.log("Auth Error Message:", error.message);

      let msg = error.message;
      if (error.code === "auth/email-already-in-use" || error.code === "custom/account-exists") {
        msg = "Email already registered. Please login.";
      } else if (error.code === "auth/invalid-email") {
        msg = "Invalid email format";
      } else if (error.code === "auth/weak-password") {
        msg = "Weak password (min 6 chars)";
      } else if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
        msg = "User not found or invalid credentials. Please check or register.";
      } else if (error.code === "auth/wrong-password") {
        msg = "Incorrect password";
      }
      
      setLocalError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || (user && !mongoUser && !pendingCred)) {
    return (
      <div className="min-h-screen bg-[#0B0C10] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#E50914] animate-spin" />
        <p className="mt-4 text-[#E50914] font-mono tracking-widest animate-pulse">SYNCING TO UPSIDE DOWN...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0C10] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* CSS Animated Fog Element */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" 
           style={{ 
             backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")',
             animation: 'fogMove 20s linear infinite' 
           }}>
      </div>

      <motion.div 
        initial={{ y: 50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ duration: 1 }}
        className="z-10 text-center flex flex-col items-center w-full max-w-md relative"
      >
        <div className="absolute -inset-1 blur-2xl opacity-50 bg-[#E50914] rounded-full animate-pulse z-[-1]"></div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-widest text-[#E50914] mb-4 uppercase drop-shadow-[0_0_15px_#E50914]">
          TimeVault
        </h1>
        
        <AnimatePresence mode="wait">
          {pendingCred ? (
            <motion.div
              key="linking"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full bg-[#111] border-2 border-yellow-500/50 p-8 rounded-lg shadow-[0_0_30px_rgba(234,179,8,0.2)] flex flex-col gap-6"
            >
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wider border-b border-gray-800 pb-2">
                Unified Linking Configured
              </h2>
              <p className="text-sm font-mono text-gray-400">
                An account already exists using that email. Please authenticate with <strong className="text-yellow-500 uppercase">{existingMethod.includes('github') ? 'github' : existingMethod.includes('google') ? 'google' : 'email'}</strong> to securely link your credentials.
              </p>

              {existingMethod.includes('google') && (
                <button onClick={() => handleProviderLogin(signInWithGoogle)} className="w-full relative border border-gray-700 bg-black px-6 py-4 text-white hover:border-yellow-500 transition-all font-mono uppercase tracking-widest">
                  Authenticate with Google
                </button>
              )}
              {existingMethod.includes('github') && (
                <button onClick={() => handleProviderLogin(signInWithGithub)} className="w-full relative border border-gray-700 bg-black px-6 py-4 text-white hover:border-yellow-500 transition-all font-mono uppercase tracking-widest">
                  Authenticate with GitHub
                </button>
              )}
              {existingMethod.includes('password') && (
                <div className="flex flex-col gap-3">
                  <input type="password" placeholder="Matrix Password" value={password} onChange={e => setPassword(e.target.value)} className="bg-black border border-gray-800 p-3 text-white font-mono placeholder:text-gray-600 focus:outline-none focus:border-yellow-500" />
                  <button onClick={() => {
                    const res = signInWithEmailPass(email, password); // need to get email from pending linking state if passed, but context has it or user types it. Actually, wait! The user must type their email or it was passed?
                    // We need the email from linking state. We should populate it.
                    handleProviderLogin(() => res); // Wait, this uses provider login wrapper wrapper, but email is already passed to signInWithEmailPass
                  }} className="w-full relative border border-gray-700 bg-black px-6 py-4 text-white hover:border-yellow-500 transition-all font-mono uppercase tracking-widest">
                    Link password account
                  </button>
                </div>
              )}

              <button onClick={() => setPendingCred(null)} className="text-xs text-gray-600 font-mono hover:text-white mt-4 uppercase tracking-widest">
                Cancel Linking
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full bg-[#111] border border-[#E50914]/30 p-8 rounded-lg shadow-[0_0_30px_rgba(229,9,20,0.2)] flex flex-col gap-5"
            >
              <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wider border-b border-[#E50914]/30 pb-2">
                Authenticate Identity
              </h2>

              <form onSubmit={handleEmailAction} className="flex flex-col gap-3">
                {localError && (
                  <div className="bg-[#8b0000]/20 border border-[#E50914] text-[#E50914] text-xs font-mono p-2 text-center uppercase tracking-widest">
                    {localError}
                  </div>
                )}
                
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="OPERATIVE EMAIL"
                    className="w-full bg-black border border-gray-800 p-3 pl-10 text-white font-mono text-sm tracking-widest placeholder:text-gray-600 focus:outline-none focus:border-[#E50914] transition-colors"
                  />
                </div>
                
                {mode !== 'magic' && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="ACCESS CIPHER"
                      className="w-full bg-black border border-gray-800 p-3 pl-10 text-white font-mono text-sm tracking-widest placeholder:text-gray-600 focus:outline-none focus:border-[#E50914] transition-colors"
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end -mt-1 -mb-1">
                    <button 
                      type="button" 
                      onClick={() => resetPassword(email)}
                      className="text-[10px] font-mono tracking-widest uppercase text-gray-500 hover:text-[#E50914] transition-colors"
                    >
                      Forgot Cipher?
                    </button>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || isSubmitting || !email || (mode !== 'magic' && password.length < 6)} 
                  className="mt-2 w-full bg-[#E50914] text-white p-3 font-mono text-sm font-bold uppercase tracking-widest hover:bg-[#ff3b3b] shadow-[0_0_15px_rgba(229,9,20,0.5)] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Initiate Login' : mode === 'signup' ? 'Create Identity' : 'Send Magic Link'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              <div className="flex justify-between px-1 -mt-1 border-b border-gray-800 pb-4">
                <button onClick={() => setMode('login')} className={`text-[10px] font-mono tracking-widest uppercase transition-colors ${mode === 'login' ? 'text-[#E50914]' : 'text-gray-500 hover:text-gray-300'}`}>Login</button>
                <button onClick={() => setMode('signup')} className={`text-[10px] font-mono tracking-widest uppercase transition-colors ${mode === 'signup' ? 'text-[#E50914]' : 'text-gray-500 hover:text-gray-300'}`}>Register</button>
                <button onClick={() => setMode('magic')} className={`text-[10px] font-mono tracking-widest uppercase transition-colors ${mode === 'magic' ? 'text-[#E50914]' : 'text-gray-500 hover:text-gray-300'}`}>Passwordless</button>
              </div>

              <div className="w-full flex gap-3 pt-2">
                <button 
                  onClick={() => handleProviderLogin(signInWithGoogle)}
                  className="flex-1 border border-gray-700 bg-black py-3 text-white uppercase text-xs tracking-widest transition-all duration-300 hover:border-[#E50914] hover:shadow-[0_0_15px_rgba(229,9,20,0.4)] flex justify-center items-center gap-2 font-mono group"
                >
                  <Zap size={14} className="group-hover:animate-pulse text-[#E50914]" /> Google
                </button>
                <button 
                  onClick={() => handleProviderLogin(signInWithGithub)}
                  className="flex-1 border border-gray-700 bg-black py-3 text-white uppercase text-xs tracking-widest transition-all duration-300 hover:border-[#E50914] hover:shadow-[0_0_15px_rgba(229,9,20,0.4)] flex justify-center items-center gap-2 font-mono group"
                >
                  <Github size={14} className="group-hover:animate-pulse text-gray-400" /> GitHub
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
