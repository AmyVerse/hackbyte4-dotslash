import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useTable } from 'spacetimedb/react';
import { tables } from '../module_bindings';
import type { LiveEntities, Incidents, DistressSignals } from '../module_bindings/types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

let lastKnownLocation: [number, number] | null = null;

// ── Emoji icon helper ──────────────────────────────────────────────────
const EMOJI: Record<string, string> = {
  ambulance: '🚑',
  firetruck: '🚒',
  police: '🚔',
  volunteer: '🙋',
  rescue: '🆘',
  default: '🚨',
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
  // ── SpacetimeDB data ────────────────────────────────────────────
  const [allEntities] = useTable(tables.live_entities);
  const [allIncidents] = useTable(tables.incidents);
  const [allSignals] = useTable(tables.distress_signals);


  // ── Derived data ────────────────────────────────────────────────
  const responders = useMemo(() => allEntities.filter((e: LiveEntities) => e.type === 'responder'), [allEntities]);
  const distressSignals = useMemo(() => {
    const incidentById = new Map<number, Incidents>();
    allIncidents.forEach((incident) => {
      incidentById.set(Number(incident.incidentId), incident);
    });
    const entityByPhone = new Map<string, LiveEntities>();
    allEntities.forEach((e) => {
      if (e.userPhone) entityByPhone.set(e.userPhone, e);
    });

    return allSignals.map((signal: DistressSignals) => {
      const incident = signal.incidentId != null ? incidentById.get(Number(signal.incidentId)) : undefined;
      const entity = signal.userPhone ? entityByPhone.get(signal.userPhone) : undefined;

      const lat = incident?.lat ?? entity?.lat;
      const lng = incident?.lng ?? entity?.lng;

      return {
        ...signal,
        lat,
        lng,
      };
    }).filter((s) => s.lat !== undefined && s.lng !== undefined);
  }, [allSignals, allIncidents, allEntities]);
  const activeIncidents = useMemo(() => allIncidents.filter((i: Incidents) => i.status === 'active'), [allIncidents]);

  // ── Find nearest incident utility ──────────────────────────────────
  const getNearestIncident = (lat: number, lng: number) => {
    if (activeIncidents.length === 0) return null;
    let nearest = activeIncidents[0];
    let minD = Infinity;
    activeIncidents.forEach(inc => {
      const d = Math.sqrt(Math.pow(inc.lat - lat, 2) + Math.pow(inc.lng - lng, 2));
      if (d < minD) {
        minD = d;
        nearest = inc;
      }
    });
    return nearest;
  };

  // ── Fetch route from Mapbox ────────────────────────────────────────
  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
        { method: 'GET' }
      );
      const json = await query.json();
      if (json.code !== 'Ok') return null;
      const data = json.routes[0];
      const route = data.geometry.coordinates;
      const geojson: any = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route
        }
      };

      if (mapInstance.current) {
        if (mapInstance.current.getSource('route')) {
          (mapInstance.current.getSource('route') as mapboxgl.GeoJSONSource).setData(geojson);
        } else {
          mapInstance.current.addSource('route', {
            type: 'geojson',
            data: geojson
          });
          mapInstance.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#ff3b30',
              'line-width': 5,
              'line-opacity': 0.75
            }
          });
        }
      }
      return { distance: data.distance, duration: data.duration };
    } catch (err) {
      console.error('Routing failed:', err);
      return null;
    }
  };

  // ── Effect: Handle routing ──────────────────
  useEffect(() => {
    if (selectedEntity && (selectedEntity.type === 'responder' || selectedEntity.type === 'distress')) {
      const nearest = getNearestIncident(selectedEntity.lat, selectedEntity.lng);
      if (nearest) {
        fetchRoute([selectedEntity.lng, selectedEntity.lat], [nearest.lng, nearest.lat])
          .then(info => setRouteInfo(info));
      } else {
        setRouteInfo(null);
      }
    } else {
      setRouteInfo(null);
      if (mapInstance.current && mapInstance.current.getLayer('route')) {
        mapInstance.current.removeLayer('route');
      }
      if (mapInstance.current && mapInstance.current.getSource('route')) {
        mapInstance.current.removeSource('route');
      }
    }
  }, [selectedEntity]);

  useEffect(() => {
    if (mapInstance.current || !mapContainer.current) return;

    const initialCenter: [number, number] = (paramLat && paramLng)
      ? [parseFloat(paramLng), parseFloat(paramLat)]
      : lastKnownLocation || [79.9864, 23.1815];

    const initialZoom = (paramLat && paramLng) ? 16 : (lastKnownLocation ? 16 : 12);

    mapInstance.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/standard',
      center: initialCenter,
      zoom: initialZoom,
      antialias: true,
      attributionControl: false
    });

    if ("geolocation" in navigator && !lastKnownLocation) {      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          lastKnownLocation = [longitude, latitude];
          setUserLocation({ lat: latitude, lng: longitude });

          if (mapInstance.current && !paramLat) {
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

    mapInstance.current.on('click', (e) => {
      if (!(e.originalEvent.target as HTMLElement).closest('.mapboxgl-marker')) {
        setSelectedEntity(null);
      }
    });

  }, []);

  useEffect(() => {
    if (!mapInstance.current || !paramLat || !paramLng) return;
    mapInstance.current.flyTo({
      center: [parseFloat(paramLng), parseFloat(paramLat)],
      zoom: 16,
      duration: 2000,
      essential: true
    });
  }, [paramLat, paramLng]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const markers: mapboxgl.Marker[] = [];
    responders.forEach((entity: LiveEntities) => {
      const el = document.createElement('div');
      el.innerHTML = `<span role="img" aria-label="${entity.subType}" style="font-size: 36px;">${EMOJI[entity.subType] ?? EMOJI.default}</span>`;
      el.style.width = '48px';
      el.style.height = '48px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';
      el.onclick = (e) => {
        e.stopPropagation();
        setSelectedEntity({
          id: entity.id.toHexString(),
          entityNumber: entity.entityNumber,
          type: 'responder',
          subType: entity.subType,
          status: entity.status,
          phone: entity.userPhone,
          lat: entity.lat,
          lng: entity.lng,
          destinationLat: entity.destinationLat,
          destinationLng: entity.destinationLng,
        });
      };
      const marker = new mapboxgl.Marker(el).setLngLat([entity.lng, entity.lat]).addTo(mapInstance.current!);
      markers.push(marker);
    });
    return () => { markers.forEach(marker => marker.remove()); };
  }, [responders]);

<<<<<<< HEAD
  // ── Draw destination line when an entity is selected ─────────────────
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Helper to safely clean up
    const removeLine = () => {
      if (map.getLayer('destination-line')) map.removeLayer('destination-line');
      if (map.getSource('destination-source')) map.removeSource('destination-source');
      if (map.getLayer('destination-target')) map.removeLayer('destination-target');
      if (map.getSource('destination-target-source')) map.removeSource('destination-target-source');
    };

    removeLine();

    if (selectedEntity && selectedEntity.entityNumber !== undefined) {
      const entity = responders.find((r: LiveEntities) => r.entityNumber === selectedEntity.entityNumber);
      if (entity && entity.destinationLat !== undefined && entity.destinationLng !== undefined) {
        
        map.addSource('destination-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [entity.lng, entity.lat],
                [entity.destinationLng, entity.destinationLat]
              ]
            },
            properties: {}
          }
        });

        // Draw dotted line
        map.addLayer({
          id: 'destination-line',
          type: 'line',
          source: 'destination-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
            'line-dasharray': [2, 2],
            'line-opacity': 0.8
          }
        });

        // Destination target point
        map.addSource('destination-target-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [entity.destinationLng, entity.destinationLat]
            },
            properties: {}
          }
        });
        
        map.addLayer({
          id: 'destination-target',
          type: 'circle',
          source: 'destination-target-source',
          paint: {
            'circle-radius': 6,
            'circle-color': '#3b82f6',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
          }
        });
      }
    }
  }, [selectedEntity, responders]);

  // ── Add markers for distress signals ────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current) return;
    const markers: mapboxgl.Marker[] = [];

    distressSignals.forEach((signal) => {
      const el = document.createElement('div');
      el.innerHTML = '<span role="img" aria-label="distress" style="font-size: 36px; color: #3b82f6;">🚨</span>';
      el.style.width = '48px';
      el.style.height = '48px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';

      el.onclick = (e) => {
        e.stopPropagation();
        setSelectedEntity({
          id: signal.signalId.toString(),
          type: 'distress',
          subType: 'Distress Signal',
          status: signal.status,
          phone: signal.userPhone,
          lat: signal.lat!,
          lng: signal.lng!
        });
      };
      
      const marker = new mapboxgl.Marker(el).setLngLat([signal.lng!, signal.lat!]).addTo(mapInstance.current!);
      markers.push(marker);
    });

    return () => { markers.forEach(marker => marker.remove()); };
  }, [distressSignals]);

  useEffect(() => {
    if (!mapInstance.current) return;
    const markers: mapboxgl.Marker[] = [];
    activeIncidents.forEach((incident: Incidents) => {
      const el = document.createElement('div');
      el.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="#ff3b30" stroke="#fff" stroke-width="2"/>
          <circle cx="12" cy="10" r="3" fill="#fff"/>
        </svg>
      `;
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.cursor = 'pointer';
      el.style.filter = 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))';
      el.onclick = (e) => {
        e.stopPropagation();
        setSelectedEntity({
          id: incident.incidentId.toString(),
          type: 'incident',
          subType: incident.category,
          status: incident.status,
          lat: incident.lat,
          lng: incident.lng,
          description: incident.description
        });
      };
      const marker = new mapboxgl.Marker(el).setLngLat([incident.lng, incident.lat]).addTo(mapInstance.current!);
      markers.push(marker);
    });
    return () => { markers.forEach(marker => marker.remove()); };
  }, [activeIncidents]);

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" />
      <AnimatePresence>
        {isLocating && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed top-24 left-10 bg-white p-5 pr-8 border-l-8 border-espresso border-y border-r shadow-2xl flex items-center gap-4 z-5000"
          >
            <div className="w-3 h-3 bg-terracotta rounded-full animate-pulse" />
            <span className="text-[14px] font-black text-espresso tracking-widest uppercase">Locating you...</span>
          </motion.div>
        )}

        {selectedEntity && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-24 right-6 w-[350px] max-h-[calc(100vh-140px)] bg-white/85 backdrop-blur-xl border border-espresso/20 shadow-2xl z-5000 flex flex-col rounded-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-espresso text-white p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-xs flex items-center justify-center text-2xl">
                  {selectedEntity.type === 'responder' ? EMOJI[selectedEntity.subType] : selectedEntity.type === 'distress' ? '🚨' : '🔥'}
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedEntity(null); }} className="text-white/40 hover:text-white transition-colors cursor-pointer p-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">{selectedEntity.subType}</h2>
              <p className="text-[10px] font-black uppercase tracking-[.3em] opacity-40">{selectedEntity.type} Tactical Node</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-espresso/30 mb-2">Current Status</h4>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${selectedEntity.status === 'active' || selectedEntity.status === 'responding' ? 'bg-emerald-500 animate-pulse' : 'bg-espresso/20'}`} />
                  <span className="text-lg font-bold text-espresso capitalize">{selectedEntity.status}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-espresso/30 mb-2">Coordinates</h4>
                <p className="text-base font-bold text-espresso tracking-tight">{selectedEntity.lat.toFixed(6)}, {selectedEntity.lng.toFixed(6)}</p>
              </div>

              {selectedEntity.phone && (
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-espresso/30 mb-2">Comms Frequency</h4>
                  <p className="text-base font-bold text-espresso tracking-tight">📞 {selectedEntity.phone}</p>
                </div>
              )}

              {routeInfo && (
                <div className="bg-espresso/5 border border-espresso/10 p-5 rounded-xs">
                  <div className="flex justify-between items-end">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-espresso/30 mb-1">Route Distance</h4>
                      <p className="text-xl font-black text-espresso">{routeInfo.distance < 1000 ? `${routeInfo.distance.toFixed(0)}m` : `${(routeInfo.distance / 1000).toFixed(1)}km`}</p>
                    </div>
                    <div className="text-right">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-espresso/30 mb-1">Estimated ETA</h4>
                      <p className="text-xl font-black text-terracotta">~{Math.max(1, Math.round(routeInfo.duration / 60))} MIN</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-espresso/5 flex items-center gap-2">
                    <div className="w-2 h-2 bg-terracotta rounded-full animate-ping" />
                    <span className="text-[9px] font-black text-espresso/40 uppercase tracking-widest">Live Traffic Routing Active</span>
                  </div>
                </div>
              )}

              {!routeInfo && userLocation && (
                <div className="bg-espresso/5 border border-espresso/10 p-5 rounded-xs">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-espresso/30 mb-1">Distance to Node</h4>
                   <p className="text-xl font-black text-espresso">
                    {(() => {
                      const R = 6371;
                      const dLat = (selectedEntity.lat - userLocation.lat) * Math.PI / 180;
                      const dLon = (selectedEntity.lng - userLocation.lng) * Math.PI / 180;
                      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(selectedEntity.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                      const d = R * c;
                      return d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)}km`;
                    })()}
                  </p>
                </div>
              )}

              {selectedEntity.type === 'incident' && (
                <div className="pt-4">
                  <Link to={`/incident/${selectedEntity.id}`} className="flex items-center justify-center gap-2 w-full py-4 border border-espresso text-espresso text-[11px] font-black uppercase tracking-[.2em] hover:bg-espresso hover:text-white transition-all rounded-xs shadow-sm">
                    View Tactical Briefing
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-espresso/5">
              <button className="w-full py-4 bg-espresso text-white text-[12px] font-black uppercase tracking-[.3em] hover:bg-espresso/90 transition-all rounded-xs shadow-xl flex items-center justify-center gap-3" onClick={() => { mapInstance.current?.flyTo({ center: [selectedEntity.lng, selectedEntity.lat], zoom: 17, essential: true }); }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                </svg>
                Focus Command
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MapComponent;
