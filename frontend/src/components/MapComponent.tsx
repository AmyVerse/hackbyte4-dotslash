import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

let lastKnownLocation: [number, number] | null = null;

const MapComponent = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (mapInstance.current || !mapContainer.current) return;

    const initialCenter: [number, number] = lastKnownLocation || [77.2090, 28.6139];
    const initialZoom = lastKnownLocation ? 16 : 12;

    mapInstance.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: initialCenter,
      zoom: initialZoom,
      antialias: true,
      attributionControl: false
    });

    if ("geolocation" in navigator && !lastKnownLocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          lastKnownLocation = [longitude, latitude];

          if (mapInstance.current) {
            mapInstance.current.flyTo({
              center: [longitude, latitude],
              zoom: 16,
              duration: 3000,
              essential: true
            });

            userMarker.current = new mapboxgl.Marker({ color: '#553a34' })
              .setLngLat([longitude, latitude])
              .addTo(mapInstance.current);
          }
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" />
      <AnimatePresence>
        {isLocating && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed bottom-10 right-10 bg-white p-5 pr-8 border-l-[8px] border-espresso border-y border-r border-[#dac2b6]/30 shadow-2xl flex items-center gap-4 z-[5000]"
          >
            <div className="w-3 h-3 bg-terracotta rounded-full animate-pulse" />
            <span className="text-[14px] font-black text-espresso tracking-widest uppercase">Locating you...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MapComponent;
