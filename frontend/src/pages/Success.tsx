import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const Success = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-5000 bg-espresso flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div className="mx-auto w-20 h-20 bg-surface flex items-center justify-center rounded-full border border-white/20 shadow-2xl">
          <svg
            className="w-10 h-10 text-espresso"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-4">
          <h1 className="text-white text-2xl md:text-3xl font-black uppercase tracking-tighter">
            REPORT SUBMITTED
          </h1>
          <p className="text-white/60 text-sm md:text-base font-bold uppercase tracking-widest leading-relaxed">
            Rest assured, report is submitted. <br />
            Help is on the way.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full bg-white text-black py-4 font-black uppercase tracking-widest text-[12px] rounded-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </motion.div>
    </div>
  );
};

export default Success;
