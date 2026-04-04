import { useTable } from 'spacetimedb/react'
import { tables } from '../../module_bindings'
import type { LiveEntities, Incidents, DistressSignals } from '../../module_bindings/types'
import type { PlacementMode } from './GodModeContainer'

interface Props {
  connected: boolean
  placementMode: PlacementMode
  setPlacementMode: (mode: PlacementMode) => void
}

function StatBadge({
  label, value, color,
}: {
  label: string; value: number; color: string
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 10,
      border: `1px solid ${color}40`,
    }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1, color: '#f5f5f7' }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
      </div>
    </div>
  )
}

function ModeButton({ 
  mode, currentMode, onClick, color, label 
}: { 
  mode: PlacementMode, currentMode: PlacementMode, onClick: () => void, color: string, label: string 
}) {
  const isActive = mode === currentMode;
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '10px',
        background: isActive ? color : 'transparent',
        border: `1px solid ${color}`,
        borderRadius: '6px', cursor: 'pointer',
        color: isActive ? '#000' : color,
        fontWeight: 'bold', fontSize: '13px',
        transition: 'all 0.2s', marginBottom: '8px'
      }}
    >
      {label}
    </button>
  )
}

export default function GodModeControls({ connected, placementMode, setPlacementMode }: Props) {
  const [allEntities]  = useTable(tables.live_entities)
  const [allIncidents] = useTable(tables.incidents)
  const [allSignals]   = useTable(tables.distress_signals)

  const activeIncidents = allIncidents.filter((i: Incidents) => i.status === 'active')
  const responders      = allEntities.filter((e: LiveEntities) => e.type === 'responder')
  const pendingSOS      = allSignals.filter((s: DistressSignals) => s.status === 'pending')

  return (
    <div
      style={{
        position: 'absolute', top: 20, right: 20, zIndex: 1000,
        padding: '18px 20px', width: 280,
        display: 'flex', flexDirection: 'column', gap: 14,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid #333',
        borderRadius: '12px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>GOD MODE</div>
          <div style={{ fontSize: 10, color: '#999' }}>Rescue Link</div>
        </div>
        {/* Live connection dot */}
        <div
          title={connected ? 'Connected' : 'Not connected'}
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
        <StatBadge label="Incidents"    value={activeIncidents.length} color="#ff3b30" />
        <StatBadge label="Responders"   value={responders.length}      color="#0a84ff" />
        <StatBadge label="Pending SOS"  value={pendingSOS.length}      color="#ff9500" />
        <StatBadge label="All Entities" value={allEntities.length}     color="#30d158" />
      </div>

      <div style={{ height: 1, background: '#333' }} />

      {/* Spawning Controls */}
      <div>
        <div style={{ fontSize: 11, color: '#999', marginBottom: '10px', textTransform: 'uppercase' }}>
          Select mode then click map:
        </div>
        <ModeButton mode="incident" currentMode={placementMode} onClick={() => setPlacementMode(placementMode === 'incident' ? 'none' : 'incident')} color="#ff3b30" label="🔴 Incident" />
        <ModeButton mode="ambulance" currentMode={placementMode} onClick={() => setPlacementMode(placementMode === 'ambulance' ? 'none' : 'ambulance')} color="#0a84ff" label="🚑 Ambulance" />
        <ModeButton mode="firetruck" currentMode={placementMode} onClick={() => setPlacementMode(placementMode === 'firetruck' ? 'none' : 'firetruck')} color="#ff9500" label="🚒 Firetruck" />
        <ModeButton mode="police" currentMode={placementMode} onClick={() => setPlacementMode(placementMode === 'police' ? 'none' : 'police')} color="#8a2be2" label="🚔 Police Unit" />
        <ModeButton mode="volunteer" currentMode={placementMode} onClick={() => setPlacementMode(placementMode === 'volunteer' ? 'none' : 'volunteer')} color="#30d158" label="🙋 Volunteer" />
      </div>

      <div style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: '4px' }}>
        Click any item on map to Delete.
      </div>
    </div>
  )
}
