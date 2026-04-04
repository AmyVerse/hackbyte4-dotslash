/**
 * GodModeMap.tsx  –  Rescue Link "God Mode" Visual Editor
 * ─────────────────────────────────────────────────────────
 * Route: /demo-show-not-production
 *
 * Uses the official SpacetimeDB React hooks pattern:
 *   useTable(tables.live_entities)   → live responders / distress markers
 *   useTable(tables.incidents)       → active incidents
 *   useTable(tables.distress_signals) → SOS signals
 *   useReducer(reducers.godModeMoveEntity) → move / spawn entities
 *   useSpacetimeDB()                 → connection state (isActive)
 * ─────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import type { LeafletEventHandlerFnMap } from 'leaflet'
import {
  AlertTriangle,
  Flame,
  Users,
  Radio,
  Zap,
  Activity,
} from 'lucide-react'


// ── SpacetimeDB React hooks ────────────────────────────────────────────
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react'
import { Identity } from 'spacetimedb'

// ── Generated bindings ─────────────────────────────────────────────────
import { tables, reducers } from '../module_bindings'
import type { LiveEntities, Incidents, DistressSignals } from '../module_bindings/types'

// ── Constants ──────────────────────────────────────────────────────────
const MAP_CENTER: [number, number] = [40.7128, -74.006]
const MAP_ZOOM = 13

// ── Emoji icon helper ──────────────────────────────────────────────────
const EMOJI: Record<string, string> = {
  ambulance: '🚑',
  firetruck: '🚒',
  police:    '🚔',
  default:   '🚨',
}

function makeEmojiIcon(subType: string) {
  return L.divIcon({
    className:   'responder-icon',
    html:        `<span role="img" aria-label="${subType}">${EMOJI[subType] ?? EMOJI.default}</span>`,
    iconSize:    [36, 36],
    iconAnchor:  [18, 18],
    popupAnchor: [0, -20],
  })
}

// ── Reset map view ─────────────────────────────────────────────────────
function DefaultView() {
  const map = useMap()
  useEffect(() => { map.setView(MAP_CENTER, MAP_ZOOM) }, [map])
  return null
}

// ── Draggable responder marker ─────────────────────────────────────────
interface ResponderMarkerProps {
  entity: LiveEntities
  onDrag: (entity: LiveEntities, lat: number, lng: number) => void
}

function ResponderMarker({ entity, onDrag }: ResponderMarkerProps) {
  const markerRef = useRef<L.Marker>(null)
  
  const isDragging = useRef(false)
  // Store only the INITIAL position. If we pass dynamic server props to <Marker position={}>, 
  // React-Leaflet will aggressively interrupt active drags to apply the prop.
  const [initialPos] = useState<[number, number]>([entity.lat, entity.lng])

  // Keep latest entity and function in refs so references inside drag handlers are always fresh
  const entityRef = useRef(entity)
  const onDragRef = useRef(onDrag)

  useEffect(() => {
    entityRef.current = entity
    onDragRef.current = onDrag
    // Manually apply server updates to the Leaflet marker directly, ONLY if not dragging!
    if (!isDragging.current && markerRef.current) {
      markerRef.current.setLatLng([entity.lat, entity.lng])
    }
  }, [entity.lat, entity.lng, entity, onDrag])

  const handlers = useMemo<LeafletEventHandlerFnMap>(
    () => ({
      dragstart() {
        isDragging.current = true
      },
      drag() {
        const m = markerRef.current
        if (!m) return
        const p = m.getLatLng()
        onDragRef.current(entityRef.current, p.lat, p.lng)
      },
      dragend() {
        isDragging.current = false
      }
    }),
    [] // NO dependencies: never recreate event handlers to avoid Leaflet unbinding them mid-drag!
  )

  // Memoize icon so we don't pass a new object on every render, which also destroys the dragged DOM node
  const icon = useMemo(() => makeEmojiIcon(entity.subType), [entity.subType]);

  return (
    <Marker
      ref={markerRef}
      position={initialPos}
      icon={icon}
      draggable
      eventHandlers={handlers}
    >
      <Popup>
        <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160 }}>
          <p style={{ fontWeight: 700, marginBottom: 4 }}>
            {EMOJI[entity.subType] ?? EMOJI.default} {entity.subType.toUpperCase()}
          </p>
          <p style={{ fontSize: 12, color: '#555' }}>
            Status: <b>{entity.status}</b>
          </p>
          {entity.userPhone && (
            <p style={{ fontSize: 12, color: '#555' }}>📞 {entity.userPhone}</p>
          )}
          <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
            {entity.lat.toFixed(5)}, {entity.lng.toFixed(5)}
          </p>
        </div>
      </Popup>
    </Marker>
  )
}

// ── Stats badge ────────────────────────────────────────────────────────
function StatBadge({
  icon, label, value, color,
}: {
  icon: React.ReactNode; label: string; value: number; color: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.07)',
    }}>
      <span style={{ color, display: 'flex' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: '#f5f5f7' }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────
export default function GodModeMap() {
  // ── Connection state ──────────────────────────────────────────────
  const { isActive: connected } = useSpacetimeDB()

  // ── Live table subscriptions ──────────────────────────────────────
  // useTable returns [rows, isLoading]
  const [allEntities]  = useTable(tables.live_entities)
  const [allIncidents] = useTable(tables.incidents)
  const [allSignals]   = useTable(tables.distress_signals)

  // ── Reducer accessor ──────────────────────────────────────────────
  // CRITICAL: object syntax — not positional args
  const godModeMoveEntity = useReducer(reducers.godModeMoveEntity)

  // ── Derived slices ────────────────────────────────────────────────
  const responders      = useMemo(() => allEntities.filter((e: LiveEntities) => e.type === 'responder'), [allEntities])
  const distressMarkers = useMemo(() => allEntities.filter((e: LiveEntities) => e.type === 'distress'),  [allEntities])
  const activeIncidents = useMemo(() => allIncidents.filter((i: Incidents) => i.status === 'active'),    [allIncidents])
  const pendingSOS      = useMemo(() => allSignals.filter((s: DistressSignals) => s.status === 'pending'), [allSignals])

  // ── Drag handler ──────────────────────────────────────────────
  const handleDrag = useCallback(
    (entity: LiveEntities, lat: number, lng: number) => {
      godModeMoveEntity({
        targetId: entity.id,
        lat,
        lng,
        type:    entity.type,
        subType: entity.subType,
      })
    },
    [godModeMoveEntity]
  )

  // ── Spawn 3 demo units ────────────────────────────────────────────
  const handleSpawnDemo = useCallback(() => {
    const units = [
      { key: '1', subType: 'ambulance', dLat:  0.003, dLng:  0.005 },
      { key: '2', subType: 'firetruck', dLat: -0.004, dLng: -0.003 },
      { key: '3', subType: 'police',    dLat:  0.005, dLng: -0.006 },
    ]
    units.forEach(({ key, subType, dLat, dLng }) => {
      const hex = key.padStart(64, '0');
      
      godModeMoveEntity({
        targetId: Identity.fromString(hex),
        lat: MAP_CENTER[0] + dLat,
        lng: MAP_CENTER[1] + dLng,
        type:    'responder',
        subType,
      })
    })
  }, [godModeMoveEntity])

  const incidentColor = (cat: string) =>
    cat === 'fire' || cat === 'medical' ? '#ff3b30' : '#ff453a'

  // ─────────────────────────────────────────────────────────────────
  return (
    <div >

      {/* ══ Leaflet Map ══════════════════════════════════════════════ */}
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ height: '100vh', width: '100vw' }}
        zoomControl={false}
      >
        <DefaultView />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {/* ─── Incidents: red CircleMarkers (r=20) ─── */}
        {activeIncidents.map((inc: Incidents) => (
          <CircleMarker
            key={String(inc.incidentId)}
            center={[inc.lat, inc.lng]}
            radius={20}
            pathOptions={{
              color:       incidentColor(inc.category),
              fillColor:   incidentColor(inc.category),
              fillOpacity: 0.22,
              weight:      2.5,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                <p style={{ fontWeight: 700, color: '#ff3b30', marginBottom: 4 }}>
                  🔴 {inc.category.toUpperCase()} INCIDENT
                </p>
                <p style={{ fontSize: 12, lineHeight: 1.5 }}>{inc.description}</p>
                <p style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                  ID #{String(inc.incidentId)} · {inc.status}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* ─── Distress live_entities (type=distress): orange, always blinking ─── */}
        {distressMarkers.map((e: LiveEntities) => (
          <CircleMarker
            key={e.id.toHexString()}
            center={[e.lat, e.lng]}
            radius={10}
            className="distress-blink"
            pathOptions={{
              color:       '#ff9500',
              fillColor:   '#ff9500',
              fillOpacity: 0.55,
              weight:      2,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif' }}>
                <p style={{ fontWeight: 700, color: '#ff9500' }}>🆘 DISTRESS</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Status: {e.status}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* ─── SOS distress_signals table: pending = blinking ─── */}
        {allSignals.map((sig: DistressSignals) => (
          <CircleMarker
            key={String(sig.signalId)}
            center={MAP_CENTER}
            radius={8}
            className={sig.status === 'pending' ? 'distress-blink' : ''}
            pathOptions={{
              color:       '#ff9500',
              fillColor:   '#ff9500',
              fillOpacity: sig.status === 'pending' ? 0.75 : 0.28,
              weight:      1.5,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                <p style={{ fontWeight: 700, color: '#ff9500', marginBottom: 4 }}>
                  🆘 SOS — Severity {sig.severity}/5
                </p>
                <p style={{ fontSize: 12 }}>{sig.message}</p>
                <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  {sig.userPhone} · {sig.status}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* ─── Responders: draggable emoji markers ─── */}
        {responders.map((e: LiveEntities) => (
          <ResponderMarker
            key={e.id.toHexString()}
            entity={e}
            onDrag={handleDrag}
          />
        ))}
      </MapContainer>

      {/* ══ Glass Panel (top-right) ═══════════════════════════════════ */}
      <div
        className="glass-panel"
        id="god-mode-panel"
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 1000,
          padding: '18px 20px', width: 264,
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #ff3b30, #ff6b35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Radio size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7' }}>GOD MODE</div>
            <div style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Rescue Link
            </div>
          </div>
          {/* Live connection dot */}
          <div
            title={connected ? 'Connected to SpacetimeDB' : 'Not connected'}
            style={{
              marginLeft: 'auto',
              width: 9, height: 9, borderRadius: '50%',
              background: connected ? '#30d158' : '#ff453a',
              boxShadow: connected ? '0 0 8px #30d158' : '0 0 8px #ff453a',
              transition: 'background 0.3s',
            }}
          />
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <StatBadge icon={<Flame size={14}/>}        label="Incidents"    value={activeIncidents.length} color="#ff3b30" />
          <StatBadge icon={<Users size={14}/>}         label="Responders"   value={responders.length}      color="#0a84ff" />
          <StatBadge icon={<AlertTriangle size={14}/>} label="Pending SOS"  value={pendingSOS.length}      color="#ff9500" />
          <StatBadge icon={<Activity size={14}/>}      label="All Entities" value={allEntities.length}     color="#30d158" />
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

        {/* Spawn demo units */}
        <button
          id="spawn-demo-units-btn"
          onClick={handleSpawnDemo}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 16px',
            background: 'linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)',
            border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 13, fontWeight: 600,
            fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(10,132,255,0.35)',
            transition: 'opacity 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          onMouseDown={e  => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e    => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Zap size={14} />
          Spawn Demo Units
        </button>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { emoji: '🚑', text: 'Ambulance — drag to move' },
            { emoji: '🚒', text: 'Fire Truck — drag to move' },
            { emoji: '🚔', text: 'Police — drag to move'    },
            { emoji: '🔴', text: 'Active Incident (r=20)'   },
            { emoji: '🟠', text: 'Distress / SOS signal'    },
          ].map(({ emoji, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#71717a' }}>
              <span style={{ fontSize: 14 }}>{emoji}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Demo watermark */}
        <div style={{
          fontSize: 9, color: '#3f3f46', textAlign: 'center',
          textTransform: 'uppercase', letterSpacing: '0.09em',
          borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8,
        }}>
          ⚠ Demo — Not Production
        </div>
      </div>
    </div>
  )
}
