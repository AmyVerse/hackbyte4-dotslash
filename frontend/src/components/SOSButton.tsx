import { useState, useEffect } from 'react';
import { useReducer, useSpacetimeDB } from 'spacetimedb/react';
import { reducers } from '../module_bindings';

export default function SOSButton() {
  const { identity } = useSpacetimeDB();
  const reportDistress = useReducer(reducers.reportDistress);
  const updateLocation = useReducer(reducers.updateLocation);
  const godModeDeleteEntity = useReducer(reducers.godModeDeleteEntity);
  
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const handleSOS = () => {
    if (isTracking) {
      // STOP TRACKING
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setIsTracking(false);
      
      // Delete the live entity from the map
      if (identity) {
        godModeDeleteEntity({ entityId: identity });
      }
      return;
    }

    // START TRACKING
    if ('geolocation' in navigator) {
      setIsTracking(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // First send the distress signal which creates the entity
          reportDistress({
            severity: 5,
            message: "Rescue needed!",
            lat,
            lng
          });
          
          // Start continuously tracking location and update the live entity
          const id = navigator.geolocation.watchPosition(
            (pos) => {
              updateLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                type: 'responder',
                subType: 'rescue'
              });
            },
            (_error) => console.error("Error watching position", _error),
            { enableHighAccuracy: true, maximumAge: 5000 }
          );
          setWatchId(id);
        },
        (_error) => {
          alert('Geolocation is required to send an SOS.');
          setIsTracking(false);
        }
      );
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

  return (
    <button
      onClick={handleSOS}
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 9999,
        background: isTracking ? '#ff9500' : '#dc2626',
        color: '#fff',
        border: isTracking ? '2px solid #fff' : 'none',
        borderRadius: '50%',
        width: '72px',
        height: '72px',
        fontWeight: '900',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isTracking ? '0 0 20px #ff9500' : '0 10px 25px rgba(220, 38, 38, 0.5)',
        cursor: 'pointer',
        animation: isTracking ? 'pulse 2s infinite' : 'none'
      }}
    >
      <style>
        {`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 149, 0, 0.7); }
            70% { box-shadow: 0 0 0 20px rgba(255, 149, 0, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 149, 0, 0); }
          }
        `}
      </style>
      <span style={{ transform: isTracking ? 'scale(0.8)' : 'scale(1)', transition: 'transform 0.2s' }}>
        {isTracking ? 'TRACKING' : 'SOS'}
      </span>
    </button>
  );
}
