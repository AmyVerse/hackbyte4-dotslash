import { useEffect, useRef, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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

  // ── Handle incoming track parameters ────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current || !paramLat || !paramLng) return;

    mapInstance.current.flyTo({
      center: [parseFloat(paramLng), parseFloat(paramLat)],
      zoom: 16,
      duration: 2000,
      essential: true
    });
  }, [paramLat, paramLng]);

  // ── Add markers for responders ──────────────────────────────────────
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

      const marker = new mapboxgl.Marker(el)
        .setLngLat([entity.lng, entity.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="font-family: Inter, sans-serif; min-width: 160px;">
            <p style="font-weight: 700; margin-bottom: 4px;">
              ${EMOJI[entity.subType] ?? EMOJI.default} ${entity.subType.toUpperCase()}
            </p>
            <p style="font-size: 12px; color: #555;">
              Status: <b>${entity.status}</b>
            </p>
            ${entity.userPhone ? `<p style="font-size: 12px; color: #555;">📞 ${entity.userPhone}</p>` : ''}
            <p style="font-size: 11px; color: #999; margin-top: 4px;">
              ${entity.lat.toFixed(5)}, ${entity.lng.toFixed(5)}
            </p>
          </div>
        `))
        .addTo(mapInstance.current!);

      markers.push(marker);
    });

    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [responders]);

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

      const marker = new mapboxgl.Marker(el)
        .setLngLat([signal.lng!, signal.lat!])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="font-family: Inter, sans-serif; min-width: 160px;">
            <p style="font-weight: 700; margin-bottom: 4px;">
              🚨 DISTRESS SIGNAL
            </p>
            <p style="font-size: 12px; color: #555;">
              Severity: <b>${signal.severity}/5</b> · Status: <b>${signal.status}</b>
            </p>
            <p style="font-size: 12px; color: #555;">${signal.message}</p>
            ${signal.userPhone ? `<p style="font-size: 12px; color: #555;">📞 ${signal.userPhone}</p>` : ''}
            <p style="font-size: 11px; color: #999; margin-top: 4px;">
              ${signal.lat!.toFixed(5)}, ${signal.lng!.toFixed(5)}
            </p>
          </div>
        `))
        .addTo(mapInstance.current!);

      markers.push(marker);
    });

    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [distressSignals]);

  // ── Add glowing circles for incidents ───────────────────────────────
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

      const marker = new mapboxgl.Marker(el)
        .setLngLat([incident.lng, incident.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="font-family: Inter, sans-serif; min-width: 160px;">
            <p style="font-weight: 700; margin-bottom: 4px;">
              🔥 INCIDENT
            </p>
            <p style="font-size: 12px; color: #555;">
              Category: <b>${incident.category}</b>
            </p>
            <p style="font-size: 12px; color: #555;">
              Status: <b>${incident.status}</b>
            </p>
            <p style="font-size: 11px; color: #999; margin-top: 4px;">
              ${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}
            </p>
          </div>
        `))
        .addTo(mapInstance.current!);

      markers.push(marker);
    });

    return () => {
      markers.forEach(marker => marker.remove());
    };
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
      </AnimatePresence>
    </>
  );
};

export default MapComponent;
