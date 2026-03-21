import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const { user, mongoUser, loading, signInWithGoogle, signInWithGithub } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && mongoUser) {
      navigate('/dashboard');
    }
  }, [user, mongoUser, navigate]);

  if (loading || (user && !mongoUser)) {
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
        <p className="text-lg text-gray-400 mb-12 tracking-wide font-mono z-10">
          Manage your reality. Master the Upside Down.
        </p>

        <div className="w-full bg-[#111] border-2 border-[#E50914] p-8 rounded-lg shadow-[0_0_30px_rgba(229,9,20,0.4)] flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-[-100%] w-full h-[2px] bg-gradient-to-r from-transparent via-[#E50914] to-transparent animate-[scanline_3s_linear_infinite]"></div>
          
          <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wider border-b border-gray-800 pb-2">
            Authenticate Identity
          </h2>
          
          <button 
            onClick={signInWithGoogle}
            className="w-full relative group overflow-hidden border border-gray-700 bg-black px-6 py-4 text-white uppercase tracking-widest transition-all duration-300 hover:border-[#E50914] hover:shadow-[0_0_15px_#E50914]"
          >
            <span className="relative z-10 font-mono group-hover:animate-pulse">Google Credentials</span>
            <div className="absolute inset-0 bg-[#E50914]/10 blur-sm group-hover:opacity-100 opacity-0 transition-opacity duration-300"></div>
          </button>

          <button 
            onClick={signInWithGithub}
            className="w-full relative group overflow-hidden border border-gray-700 bg-black px-6 py-4 text-white uppercase tracking-widest transition-all duration-300 hover:border-[#E50914] hover:shadow-[0_0_15px_#E50914]"
          >
            <span className="relative z-10 font-mono group-hover:animate-pulse">GitHub Clearance</span>
            <div className="absolute inset-0 bg-[#E50914]/10 blur-sm group-hover:opacity-100 opacity-0 transition-opacity duration-300"></div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
