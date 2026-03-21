import api from '../lib/api';
import { X, Zap } from 'lucide-react';


const SubscriptionModal = ({ onClose }: { onClose: () => void }) => {
  const handleCheckout = async () => {
    try {
      const res = await api.post('/stripe-checkout');
      window.location.href = res.data.url;
    } catch (error) {
      console.error('Checkout failed', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0c10] border border-stranger-red shadow-[0_0_30px_rgba(229,9,20,0.3)] max-w-md w-full p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X size={24} />
        </button>
        
        <h2 className="text-3xl font-bold uppercase tracking-widest text-glitch mb-2">Upgrade Status</h2>
        <p className="text-gray-400 mb-8 tracking-wide">Unlock the full potential of the Upside Down. No limits.</p>

        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-3">
            <Zap className="text-stranger-red shrink-0" />
            <div>
              <h4 className="text-white uppercase tracking-wider font-bold">Infinite Timelines</h4>
              <p className="text-sm text-gray-500">Create unlimited goals and track far into the future.</p>
            </div>
          </div>
          
          <button 
            onClick={handleCheckout}
            className="w-full relative group overflow-hidden border border-stranger-red bg-stranger-red/10 px-6 py-4 text-white uppercase tracking-widest hover:bg-stranger-red transition-all duration-300 mt-4"
          >
            <span className="relative z-10 font-bold">Initiate Protocol ($9.99/mo)</span>
            <div className="absolute inset-0 bg-white/20 blur-lg group-hover:opacity-100 opacity-0 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
