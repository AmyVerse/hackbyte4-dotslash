import { useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import { useSpacetimeDB } from 'spacetimedb/react'
import GodModeInteractions from './GodModeInteractions'
import GodModeMarkers from './GodModeMarkers'
import GodModeControls from './GodModeControls'
import IncidentReporter from '../IncidentReporter'

const MAP_CENTER: [number, number] = [21.1458, 79.0882]
const MAP_ZOOM = 13

export type PlacementMode = 'none' | 'incident' | 'ambulance' | 'firetruck' | 'police' | 'volunteer'

export default function GodModeContainer() {
  const { isActive: connected } = useSpacetimeDB()
  const [placementMode, setPlacementMode] = useState<PlacementMode>('none')
  const [incidentCoords, setIncidentCoords] = useState<{ lat: number, lng: number } | null>(null)

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#000', color: '#fff' }}>
      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{
          height: '100%', width: '100%',
          // @ts-ignore
          cursor: (placementMode !== 'none' || incidentCoords) ? 'crosshair' : 'grab'
        }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap'
          maxZoom={19}
        />
        <GodModeInteractions
          placementMode={placementMode}
          onPlaced={() => setPlacementMode('none')}
          onIncidentClick={(lat, lng) => setIncidentCoords({ lat, lng })}
        />
        <GodModeMarkers />
      </MapContainer>

      <GodModeControls
        connected={connected}
        placementMode={placementMode}
        setPlacementMode={setPlacementMode}
      />

      {incidentCoords && (
        <div style={{
          position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, width: '100%', maxWidth: '600px', padding: '0 20px'
        }}>
          <IncidentReporter
            forcedLat={incidentCoords.lat}
            forcedLng={incidentCoords.lng}
            onSuccess={() => {
              setIncidentCoords(null);
              setPlacementMode('none');
            }}
            onCancel={() => {
              setIncidentCoords(null);
            }}
          />
        </div>
      )}
    </div>
  )
}
