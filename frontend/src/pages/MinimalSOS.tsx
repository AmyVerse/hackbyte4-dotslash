import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { reducers } from '../module_bindings';
import { useReducer, useSpacetimeDB } from 'spacetimedb/react';

export default function MinimalSOS() {
  const [status, setStatus] = useState('Connecting to rescue network...');
  const location = useLocation();
  const { isActive: connected } = useSpacetimeDB();
  const [triggered, setTriggered] = useState(false);
  const reportDistress = useReducer(reducers.reportDistress);
  const updateLocation = useReducer(reducers.updateLocation);

  useEffect(() => {
    if (connected && !triggered) {
      const searchParams = new URLSearchParams(location.search);
      const latStr = searchParams.get('lat');
      const lngStr = searchParams.get('lng');

      const lat = parseFloat(latStr || '0');
      const lng = parseFloat(lngStr || '0');

      if (!latStr || !lngStr || isNaN(lat) || isNaN(lng)) {
        setStatus('Error: Provided URL is missing valid lat/lng parameters.');
        return;
      }

      setStatus('Broadcasting SOS...');

      try {
        reportDistress({
          severity: 5,
          message: "Rescue needed!",
          lat: lat,
          lng: lng
        });
        
        // Exact identical payload as SOSButton.tsx to show up as a live 🆘 Rescue Node
        updateLocation({
          lat,
          lng,
          type: 'responder',
          subType: 'rescue'
        });

        setTimeout(() => {
          setStatus('SOS Sent Successfully.');
          setTriggered(true);
        }, 1500);
      } catch (e) {
        setStatus('Failed to send SOS.');
      }
    }
  }, [connected, location.search, triggered, reportDistress, updateLocation]);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-black text-[#ef4444] font-mono p-8 text-center uppercase tracking-widest leading-relaxed">
      <div className={`mb-4 border-2 ${triggered ? 'border-[#3b82f6] text-[#3b82f6]' : 'border-[#ef4444] animate-pulse'} p-6 rounded-full inline-block`}>
        <span className="text-4xl">🚨</span>
      </div>
      <div className={triggered ? 'text-[#3b82f6]' : 'text-[#ef4444]'}>
        {status}
      </div>
    </div>
  );
}
