import { useState, useEffect } from 'react';
import { useReducer, useSpacetimeDB } from 'spacetimedb/react';
import { motion, AnimatePresence } from 'framer-motion';
import { reducers } from '../module_bindings';

interface SOSButtonProps {
  className?: string;
  isFixed?: boolean;
}

export default function SOSButton({ className = "", isFixed = true }: SOSButtonProps) {
  const { identity } = useSpacetimeDB();
  const reportDistress = useReducer(reducers.reportDistress);
  const updateLocation = useReducer(reducers.updateLocation);
  const godModeDeleteEntity = useReducer(reducers.godModeDeleteEntity);
  
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const handleSOS = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTracking) {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setIsTracking(false);
      
      if (identity) {
        godModeDeleteEntity({ entityId: identity });
      }
      return;
    }

    if ('geolocation' in navigator) {
      setIsTracking(true);
      let distressSent = false;
      
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          if (!distressSent) {
            reportDistress({
              severity: 5,
              message: "Rescue needed!",
              lat,
              lng
            });
            distressSent = true;
          }
          
          updateLocation({
            lat,
            lng,
            type: 'responder',
            subType: 'rescue'
          });
        },
        (_error) => {
          console.error("Error watching position", _error);
          if (!distressSent) {
            alert('Geolocation error: please ensure permissions are granted.');
            setIsTracking(false);
          }
        },
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
      );
      setWatchId(id);
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const baseClasses = `z-5000 flex flex-col items-center justify-center border-2 transition-all duration-500 rounded-sm overflow-hidden group shadow-lg ${
    isTracking 
      ? 'bg-white border-terracotta shadow-[0_0_20px_-5px_#974726]' 
      : 'bg-terracotta border-espresso'
  }`;

  const positionClasses = isFixed 
    ? "fixed top-20 md:top-8 right-6 md:right-8 w-16 h-16 md:w-20 md:h-20 border-4" 
    : "w-full h-full border-2";

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleSOS}
      className={`${baseClasses} ${positionClasses} ${className}`}
    >
      <AnimatePresence>
        {isTracking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-terracotta/5"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center justify-center">
        <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-0.5 transition-colors duration-500 ${
          isTracking ? 'text-terracotta/60' : 'text-white/40'
        }`}>
          {isTracking ? 'ACTIVE' : 'EMERGENCY'}
        </span>
        
        <span className={`text-[12px] md:text-[14px] font-black leading-none tracking-tighter transition-colors duration-500 ${
          isTracking ? 'text-terracotta' : 'text-white'
        }`}>
          {isTracking ? 'BEACON' : 'SOS'}
        </span>

        {isTracking && (
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [1, 0.4, 1]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute -bottom-2 w-1 h-1 bg-terracotta rounded-full"
          />
        )}
      </div>

      {!isFixed && (
         <div className={`absolute top-0.5 left-0.5 w-1 h-1 border-t border-l transition-colors duration-500 ${isTracking ? 'border-terracotta/20' : 'border-white/20'}`} />
      )}
    </motion.button>
  );
}
