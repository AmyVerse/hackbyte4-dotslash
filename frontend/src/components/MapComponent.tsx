import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { LiveEntities, Incidents } from '../module_bindings/types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

let lastKnownLocation: [number, number] | null = null;

const EMOJI: Record<string, string> = {
  ambulance: '🚑', firetruck: '🚒', police: '🚔', volunteer: '🤝', default: '🚨',
};

const MapComponent = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<mapboxgl.Map | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);
  const [searchParams] = useSearchParams();
  const paramLat = searchParams.get('lat');
  const paramLng = searchParams.get('lng');

  const [isLocating, setIsLocating] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number, duration: number } | null>(null);

  const [allEntities] = useTable(tables.live_entities);
  const [allIncidents] = useTable(tables.incidents);

  const responders = useMemo(() => allEntities.filter((e: LiveEntities) => e.type === 'responder'), [allEntities]);
  const distressMarkers = useMemo(() => allEntities.filter((e: LiveEntities) => e.type === 'distress'), [allEntities]);
  const activeIncidents = useMemo(() => allIncidents.filter((i: Incidents) => i.status === 'active'), [allIncidents]);

  const getNearestIncident = (lat: number, lng: number) => {
    if (activeIncidents.length === 0) return null;
    let nearest = activeIncidents[0];
    let minD = Infinity;
    activeIncidents.forEach(inc => {
      const d = Math.sqrt(Math.pow(inc.lat - lat, 2) + Math.pow(inc.lng - lng, 2));
      if (d < minD) { minD = d; nearest = inc; }
    });
    return nearest;
  };

  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const query = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`);
      const json = await query.json();
      if (json.code !== 'Ok') return null;
      const data = json.routes[0];
      const route = data.geometry.coordinates;
      const geojson: any = { type: 'Feature', geometry: { type: 'LineString', coordinates: route } };
      if (mapInstance.current) {
        if (mapInstance.current.getSource('route')) { (mapInstance.current.getSource('route') as mapboxgl.GeoJSONSource).setData(geojson); }
        else {
          mapInstance.current.addSource('route', { type: 'geojson', data: geojson });
          mapInstance.current.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ff3b30', 'line-width': 5, 'line-opacity': 0.75 } });
        }
      }
      return { distance: data.distance, duration: data.duration };
    } catch (err) { return null; }
  };

  useEffect(() => {
    if (selectedEntity && (selectedEntity.type === 'responder' || selectedEntity.type === 'distress')) {
      const nearest = getNearestIncident(selectedEntity.lat, selectedEntity.lng);
      if (nearest) { fetchRoute([selectedEntity.lng, selectedEntity.lat], [nearest.lng, nearest.lat]).then(info => setRouteInfo(info)); }
      else { setRouteInfo(null); }
    } else {
      setRouteInfo(null);
      if (mapInstance.current?.getLayer('route')) { mapInstance.current.removeLayer('route'); }
      if (mapInstance.current?.getSource('route')) { mapInstance.current.removeSource('route'); }
    }
  }, [selectedEntity, activeIncidents]);

  useEffect(() => {
    if (mapInstance.current || !mapContainer.current) return;
    mapInstance.current = new mapboxgl.Map({
      container: mapContainer.current, style: 'mapbox://styles/mapbox/standard',
      center: (paramLat && paramLng) ? [parseFloat(paramLng), parseFloat(paramLat)] : lastKnownLocation || [79.9864, 23.1815],
      zoom: (paramLat && paramLng) ? 16 : (lastKnownLocation ? 16 : 12),
      antialias: true, attributionControl: false
    });
    if ("geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition((pos) => {
        const { longitude, latitude } = pos.coords;
        lastKnownLocation = [longitude, latitude];
        setUserLocation({ lat: latitude, lng: longitude });
        if (mapInstance.current && !paramLat) {
          mapInstance.current.flyTo({ center: [longitude, latitude], zoom: 16, duration: 3000, essential: true });
          userMarker.current = new mapboxgl.Marker({ color: '#553a34' }).setLngLat([longitude, latitude]).addTo(mapInstance.current);
        }
        setIsLocating(false);
      }, () => setIsLocating(false), { enableHighAccuracy: true });
    }
    mapInstance.current.on('click', (e) => { if (!(e.originalEvent.target as HTMLElement).closest('.mapboxgl-marker')) setSelectedEntity(null); });
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !paramLat || !paramLng) return;
    mapInstance.current.flyTo({ center: [parseFloat(paramLng), parseFloat(paramLat)], zoom: 16, duration: 2000, essential: true });
  }, [paramLat, paramLng]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const markers: mapboxgl.Marker[] = [];
    responders.forEach(e => {
      const el = document.createElement('div');
      el.innerHTML = `<span style="font-size:24px;cursor:pointer;">${EMOJI[e.subType] ?? EMOJI.default}</span>`;
      el.onclick = (ev) => { ev.stopPropagation(); setSelectedEntity({ id: e.id.toHexString(), type: 'responder', subType: e.subType, status: e.status, phone: e.userPhone, lat: e.lat, lng: e.lng }); };
      markers.push(new mapboxgl.Marker(el).setLngLat([e.lng, e.lat]).addTo(mapInstance.current!));
    });
    return () => markers.forEach(m => m.remove());
  }, [responders]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const markers: mapboxgl.Marker[] = [];
    distressMarkers.forEach(e => {
      const el = document.createElement('div');
      el.innerHTML = '<span style="font-size:24px;cursor:pointer;">🚨</span>';
      el.onclick = (ev) => { ev.stopPropagation(); setSelectedEntity({ id: e.id.toHexString(), type: 'distress', subType: 'Distress Signal', status: e.status, phone: e.userPhone, lat: e.lat, lng: e.lng }); };
      markers.push(new mapboxgl.Marker(el).setLngLat([e.lng, e.lat]).addTo(mapInstance.current!));
    });
    return () => markers.forEach(m => m.remove());
  }, [distressMarkers]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const markers: mapboxgl.Marker[] = [];
    activeIncidents.forEach(i => {
      const el = document.createElement('div');
      el.innerHTML = `<svg width="32" height="32" style="cursor:pointer;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.3))" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#ff3b30" stroke="#fff" stroke-width="2"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>`;
      el.onclick = (ev) => { ev.stopPropagation(); setSelectedEntity({ id: i.incidentId.toString(), type: 'incident', subType: i.category, status: i.status, lat: i.lat, lng: i.lng }); };
      markers.push(new mapboxgl.Marker(el).setLngLat([i.lng, i.lat]).addTo(mapInstance.current!));
    });
    return () => markers.forEach(m => m.remove());
  }, [activeIncidents]);

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" />
      <AnimatePresence>
        {isLocating && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="fixed top-24 left-10 bg-white p-5 pr-8 border-l-8 border-espresso shadow-2xl flex items-center gap-4 z-5000">
            <div className="w-3 h-3 bg-terracotta rounded-full animate-pulse" /><span className="text-[14px] font-black text-espresso tracking-widest uppercase">Locating...</span>
          </motion.div>
        )}

        {selectedEntity && (
          <motion.div
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => { if (info.offset.y > 100) setSelectedEntity(null); }}
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            whileDrag={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-auto md:top-10 md:right-10 md:left-auto w-full md:w-[350px] bg-white/95 backdrop-blur-3xl border-t md:border border-espresso/20 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-5000 flex flex-col rounded-t-[2.5rem] md:rounded-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-center py-4 md:hidden cursor-row-resize"><div className="w-16 h-1.5 bg-espresso/10 rounded-full" /></div>

            <div className="bg-espresso text-white p-5 pt-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-white/10 rounded-xs shrink-0 flex items-center justify-center text-xl">
                    {selectedEntity.type === 'responder' ? EMOJI[selectedEntity.subType] : selectedEntity.type === 'distress' ? '🚨' : '🔥'}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black uppercase tracking-tight truncate leading-none mb-1">{selectedEntity.subType}</h2>
                    <p className="text-[8px] font-black uppercase tracking-[.3em] opacity-40 leading-none">{selectedEntity.status}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {selectedEntity.type === 'incident' && (
                    <Link to={`/incident/${selectedEntity.id}`} className="p-2 bg-white/10 rounded-xs">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>
                    </Link>
                  )}
                  <button onClick={() => setSelectedEntity(null)} className="p-2 text-white/40 hover:text-white"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-espresso/10 flex items-center justify-between bg-white/5">
              {routeInfo ? (
                <>
                  <div className="flex flex-col"><h4 className="text-[9px] font-black uppercase opacity-30 mb-0.5">Dist</h4><p className="text-base font-black text-espresso leading-none">{routeInfo.distance < 1000 ? `${routeInfo.distance.toFixed(0)}m` : `${(routeInfo.distance / 1000).toFixed(1)}km`}</p></div>
                  <div className="h-8 w-px bg-espresso/10" />
                  <div className="flex flex-col text-right"><h4 className="text-[9px] font-black uppercase opacity-30 mb-0.5">ETA</h4><p className="text-base font-black text-terracotta leading-none">~{Math.max(1, Math.round(routeInfo.duration / 60))} MIN</p></div>
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col"><h4 className="text-[9px] font-black uppercase opacity-30 mb-0.5">Coords</h4><p className="text-xs font-bold text-espresso/60">{selectedEntity.lat.toFixed(4)}, {selectedEntity.lng.toFixed(4)}</p></div>
                  <button onClick={() => { mapInstance.current?.flyTo({ center: [selectedEntity.lng, selectedEntity.lat], zoom: 17 }); }} className="px-4 py-2 bg-espresso text-white text-[9px] font-black uppercase tracking-widest rounded-xs">Center</button>
                </div>
              )}
            </div>

            <div className="px-5 pb-8 pt-2 space-y-4">
              <div className="h-px bg-espresso/5 w-full" />
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase opacity-30 tracking-widest">Signal Locked</span>
                {selectedEntity.phone && <p className="text-[11px] font-bold text-espresso underline underline-offset-4 decoration-terracotta">📞 {selectedEntity.phone}</p>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MapComponent;
