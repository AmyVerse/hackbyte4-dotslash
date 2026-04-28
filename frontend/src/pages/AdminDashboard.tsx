import { useState, useMemo, useEffect } from 'react';
import { useTable, useReducer, useSpacetimeDB } from 'spacetimedb/react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { tables, reducers } from '../module_bindings';
import type { LiveEntities, Incidents } from '../module_bindings/types';
import { Identity } from 'spacetimedb';
import MarkdownContent from '../components/MarkdownContent';
import { analyzeDispatch } from '../lib/ai';
import type { DispatchSuggestion } from '../lib/ai';

const MAP_CENTER: [number, number] = [21.1458, 79.0882];
const MAP_ZOOM = 13;

const EMOJI: Record<string, string> = {
  ambulance: '🚑',
  firetruck: '🚒',
  police: '🚔',
  volunteer: '🙋',
  rescue: '🆘',
  default: '🚨',
};



function AdminMapInteractions({
  selectedEntityNumber,
  onDestinationSelected,
  placementMode,
  onPlaced
}: {
  selectedEntityNumber: bigint | null;
  onDestinationSelected: (lat: number, lng: number) => void;
  placementMode: string;
  onPlaced: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (placementMode !== 'none') {
        onPlaced(e.latlng.lat, e.latlng.lng);
      } else if (selectedEntityNumber !== null) {
        onDestinationSelected(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function AdminDashboard() {
  const adminPasswordHash = import.meta.env.VITE_ADMIN_PASSWORD || 'password';
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  const { isActive: connected } = useSpacetimeDB();
  const [allEntities] = useTable(tables.live_entities);
  const [allIncidents] = useTable(tables.incidents);

  const adminAssignDestination = useReducer(reducers.adminAssignDestination);
  const godModeMoveEntity = useReducer(reducers.godModeMoveEntity);

  const [selectedEntity, setSelectedEntity] = useState<bigint | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<bigint | null>(null);
  const [placementMode, setPlacementMode] = useState<string>('none');
  
  const [aiSuggestion, setAiSuggestion] = useState<DispatchSuggestion | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showJustification, setShowJustification] = useState(false);
  const [analyzedIncidentId, setAnalyzedIncidentId] = useState<bigint | null>(null);
  const [suggestedResponderIds, setSuggestedResponderIds] = useState<bigint[]>([]);
  const [dispatchedIncidents, setDispatchedIncidents] = useState<Record<string, boolean>>({});

  const responders = useMemo(
    () => allEntities.filter((e: LiveEntities) => e.type === 'responder'),
    [allEntities]
  );
  
  const incidents = useMemo(
    () => [...allIncidents].sort((a: Incidents, b: Incidents) => Number(b.createdAt - a.createdAt)),
    [allIncidents]
  );

  const handleDestinationSelected = (lat: number, lng: number) => {
    if (selectedEntity !== null) {
      adminAssignDestination({
        entityNumber: selectedEntity,
        destLat: lat,
        destLng: lng,
      });
      setSelectedEntity(null);
    }
  };

  const handlePlaced = (lat: number, lng: number) => {
    if (placementMode !== 'none') {
      const randomHex = Array.from({ length: 64 })
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join('');
      godModeMoveEntity({
        targetId: Identity.fromString(randomHex),
        lat,
        lng,
        type: 'responder',
        subType: placementMode
      });
      setPlacementMode('none');
    }
  };

  useEffect(() => {
    if (selectedIncident !== null && selectedIncident !== analyzedIncidentId) {
      const inc = incidents.find(i => i.incidentId === selectedIncident);
      if (inc) {
        setIsAnalyzing(true);
        setAnalyzedIncidentId(selectedIncident);
        const idleResponders = responders.filter(r => r.destinationLat === undefined || r.destinationLat === null || r.destinationLat > 900.0);
        const availableResources: Record<string, number> = {};
        idleResponders.forEach(r => {
           availableResources[r.subType] = (availableResources[r.subType] || 0) + 1;
        });
        
        analyzeDispatch(inc.description, availableResources).then(suggestion => {
           setAiSuggestion(suggestion);
           
           const suggestedIds: bigint[] = [];
           suggestion.allocation.forEach(alloc => {
             const typeResponders = idleResponders
               .filter(r => r.subType === alloc.type)
               .map(r => ({
                 id: r.entityNumber,
                 dist: L.latLng(r.lat, r.lng).distanceTo(L.latLng(inc.lat, inc.lng))
               }))
               .sort((a, b) => a.dist - b.dist);
               
             const selected = typeResponders.slice(0, alloc.count).map(r => r.id);
             suggestedIds.push(...selected);
           });
           setSuggestedResponderIds(suggestedIds);
           setIsAnalyzing(false);
        });
      }
    } else if (selectedIncident === null) {
      setAiSuggestion(null);
      setAnalyzedIncidentId(null);
      setShowJustification(false);
      setSuggestedResponderIds([]);
    }
  }, [selectedIncident, analyzedIncidentId, incidents, responders]);

  if (!isAuthenticated) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black">
        <form 
          className="bg-[#111] p-8 rounded-xl border border-gray-800 shadow-2xl flex flex-col gap-4 text-white min-w-[300px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (passwordInput === adminPasswordHash) {
              setIsAuthenticated(true);
            } else {
              alert('Incorrect password');
            }
          }}
        >
          <h1 className="text-xl font-bold text-center mb-2">Government Admin Login</h1>
          <input
            type="password"
            placeholder="Enter Admin Password"
            className="p-3 bg-black border border-gray-700 rounded text-center text-lg outline-none focus:border-[#3b82f6]"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="bg-[#3b82f6] text-white font-bold p-3 rounded mt-2 hover:bg-[#2563eb]">
            ACCESS SYSTEM
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex w-screen h-screen bg-black text-white font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-[380px] h-full flex flex-col bg-[#111] border-r border-[#333] z-50">
        <div className="p-5 border-b border-[#333] flex items-center justify-between bg-black">
          <div>
            <h1 className="font-black text-xl text-white tracking-widest">ADMIN PORTAL</h1>
            <p className="text-xs text-gray-500 uppercase mt-1">Live Rescue Link Overview</p>
          </div>
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} title={connected ? "Connected" : "Disconnected"} />
        </div>

        {/* Responders List */}
        <div className="flex-1 overflow-y-auto border-b border-[#333]">
          <div className="p-4 bg-[#0a0a0a] sticky top-0 z-10 border-b border-[#333]">
            <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-2">Available Responders ({responders.length})</h2>
            <div className="flex flex-wrap gap-2">
              {['ambulance', 'firetruck', 'police', 'volunteer'].map(sub => (
                <button
                  key={sub}
                  onClick={() => setPlacementMode(placementMode === sub ? 'none' : sub)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    placementMode === sub ? 'bg-blue-500 text-white shadow-[0_0_10px_#3b82f6]' : 'bg-[#222] hover:bg-[#333] text-gray-400'
                  }`}
                >
                  {EMOJI[sub]} Add
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {responders.map((r: LiveEntities) => {
              const isSelected = selectedEntity === r.entityNumber;
              const hasDest = r.destinationLat !== undefined && r.destinationLat !== null && r.destinationLat <= 900.0;
              const isSuggested = suggestedResponderIds.includes(r.entityNumber);
              
              return (
                <div 
                  key={r.entityNumber.toString()} 
                  onClick={() => setSelectedEntity(isSelected ? null : r.entityNumber)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-[#3b82f6]/20 border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                      : isSuggested
                      ? 'bg-[#a855f7]/20 border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'bg-[#1a1a1a] border-[#333] hover:border-gray-500'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold">{EMOJI[r.subType] ?? EMOJI.default} UNIT #{r.entityNumber.toString()}</span>
                    <div className="flex gap-2 items-center">
                      {isSuggested && <span className="text-[10px] bg-[#a855f7] text-white px-2 py-1 rounded uppercase font-bold animate-pulse">✨ Suggested</span>}
                      <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold ${
                        r.status === 'deployed' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex flex-col gap-1">
                    <div>Type: <span className="uppercase text-white">{r.subType}</span></div>
                    {hasDest ? (
                      <div className="text-yellow-500 font-bold text-[10px] mt-1 pt-1 border-t border-[#333]">🎯 DEPLOYED TO TARGET</div>
                    ) : (
                      <div className="text-gray-500 text-[10px] mt-1 pt-1 border-t border-[#333]">IDLE - CLICK MAP TO ASSIGN</div>
                    )}
                  </div>
                </div>
              );
            })}
            {responders.length === 0 && <div className="text-center text-gray-600 text-sm py-4">No responders available.</div>}
          </div>
        </div>

        {/* Incidents List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 bg-[#0a0a0a] sticky top-0 z-10 border-b border-[#333]">
            <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Live Incidents ({incidents.length})</h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {incidents.map((inc: Incidents) => {
              const isSelected = selectedIncident === inc.incidentId;
              return (
              <div 
                key={inc.incidentId.toString()} 
                onClick={() => setSelectedIncident(isSelected ? null : inc.incidentId)}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  isSelected ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#1a1a1a] border-[#333] hover:border-gray-500'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className={`font-bold text-xs ${isSelected ? 'text-blue-400' : 'text-red-500'}`}>
                    {isSelected ? '🔵' : '🔴'} {inc.category.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(Number(inc.createdAt)).toLocaleTimeString()}
                  </span>
                </div>
                <p className={`text-sm leading-snug line-clamp-3 ${isSelected ? 'text-white' : 'text-gray-300'}`}>{inc.description}</p>
                <div className="mt-2 text-[10px] text-gray-500 font-mono">
                  ID: {inc.incidentId.toString()} • GPS: {inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}
                </div>
              </div>
            )})}
            {incidents.length === 0 && <div className="text-center text-gray-600 text-sm py-4">No active incidents.</div>}
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative">
        {/* Top AI Dispatch Panel */}
        {selectedIncident !== null && (
          <div className="absolute top-4 left-4 right-4 z-[2000] bg-black/60 backdrop-blur-xl border border-[#3b82f6]/30 rounded-xl p-4 shadow-2xl flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-xl">🤖</span>
                <h3 className="font-bold text-sm uppercase tracking-widest text-[#3b82f6]">AI Dispatch Strategy</h3>
              </div>
              {isAnalyzing && <span className="text-sm text-[#3b82f6] animate-pulse">Analyzing Incident & Allocating Resources...</span>}
            </div>
            
            {aiSuggestion && (
              <div className="mt-2 text-sm text-gray-200">
                <p className="font-bold mb-3">{aiSuggestion.suggestionText}</p>
                
                <div className="flex gap-4 items-center">
                  <div className="flex gap-2">
                    {aiSuggestion.allocation.map((alloc, idx) => (
                      <span key={idx} className="bg-[#3b82f6]/20 px-3 py-1 rounded-full border border-[#3b82f6]/50 text-[#3b82f6] font-bold text-xs uppercase tracking-wider">
                        {alloc.count}x {alloc.type}
                      </span>
                    ))}
                    {aiSuggestion.allocation.length === 0 && <span className="text-gray-500 italic bg-[#333] px-3 py-1 rounded-full text-xs">No resources to allocate</span>}
                  </div>
                  
                  <button 
                    onClick={() => setShowJustification(!showJustification)}
                    className="ml-auto text-xs px-3 py-1 border border-gray-600 font-bold rounded hover:bg-gray-800 transition-colors uppercase tracking-widest text-gray-300"
                  >
                    {showJustification ? 'Hide Reasoning' : 'View AI Reasoning'}
                  </button>
                </div>
                
                {suggestedResponderIds.length > 0 && selectedIncident && (
                  dispatchedIncidents[selectedIncident.toString()] ? (
                    <div className="mt-4 w-full bg-green-500/20 text-green-400 font-bold py-3 rounded text-xs uppercase tracking-widest text-center border border-green-500/50">
                      ✅ Units Deployed to this Incident
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const inc = incidents.find(i => i.incidentId === selectedIncident);
                        if (inc) {
                          suggestedResponderIds.forEach(id => {
                            adminAssignDestination({
                              entityNumber: id,
                              destLat: inc.lat,
                              destLng: inc.lng,
                            });
                          });
                          setSuggestedResponderIds([]);
                          setDispatchedIncidents(prev => ({ ...prev, [inc.incidentId.toString()]: true }));
                        }
                      }}
                      className="mt-4 w-full bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold py-3 rounded text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
                    >
                      ⚡ Autodeploy {suggestedResponderIds.length} Nearest Units to Incident
                    </button>
                  )
                )}

                {showJustification && (
                  <div className="mt-4 p-4 bg-[#0a0a0a]/80 border border-[#222] rounded text-sm text-gray-400 leading-relaxed">
                    <span className="text-[#3b82f6] font-bold mr-2">LOGIC:</span>{aiSuggestion.justification}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedEntity !== null && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-[#3b82f6] text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_#3b82f6] pointer-events-none animate-pulse text-sm">
            ASSIGN DESTINATION: Click anywhere on the map
          </div>
        )}
        {placementMode !== 'none' && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_#22c55e] pointer-events-none animate-pulse text-sm">
            PLACE RESPONDER: Click anywhere to drop {EMOJI[placementMode]}
          </div>
        )}
        
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          style={{ height: '100%', width: '100%', cursor: (selectedEntity || placementMode !== 'none') ? 'crosshair' : 'grab' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap'
            maxZoom={19}
          />
          
          <AdminMapInteractions 
            selectedEntityNumber={selectedEntity} 
            onDestinationSelected={handleDestinationSelected}
            placementMode={placementMode}
            onPlaced={handlePlaced}
          />

          {/* Render Incidents */}
          {incidents.map((inc: Incidents) => {
            const isSelected = selectedIncident === inc.incidentId;
            return (
            <CircleMarker
              key={`inc-${inc.incidentId}`}
              center={[inc.lat, inc.lng]}
              radius={isSelected ? 20 : 15}
              eventHandlers={{
                click: () => {
                  if (selectedEntity !== null) {
                    handleDestinationSelected(inc.lat, inc.lng);
                  } else {
                    setSelectedIncident(isSelected ? null : inc.incidentId);
                  }
                }
              }}
              pathOptions={{
                color: isSelected ? '#3b82f6' : '#ef4444', 
                fillColor: isSelected ? '#3b82f6' : '#ef4444', 
                fillOpacity: isSelected ? 0.6 : 0.3,
                weight: isSelected ? 3 : 2
              }}
            >
              <Popup><div className={`font-bold ${isSelected ? 'text-blue-500' : 'text-red-500'}`}>{inc.category.toUpperCase()}</div></Popup>
            </CircleMarker>
          )})}

          {/* Render Responders & Deployment Lines */}
          {responders.map((r: LiveEntities) => {
            const hasDest = r.destinationLat !== undefined && r.destinationLat !== null && r.destinationLat <= 900.0 && r.destinationLng !== undefined;
            const isSelected = selectedEntity === r.entityNumber;
            const icon = L.divIcon({
              className: 'responder-icon',
              html: `<span style="font-size: ${isSelected ? '32px' : '24px'}; filter: ${isSelected ? 'drop-shadow(0 0 8px #3b82f6)' : 'none'}; transition: all 0.2s;" role="img" aria-label="${r.subType}">${EMOJI[r.subType] ?? EMOJI.default}</span>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            });

            return (
              <div key={`resp-${r.entityNumber.toString()}`}>
                <Marker position={[r.lat, r.lng]} icon={icon}>
                  <Popup>Unit #{r.entityNumber.toString()} - {r.status}</Popup>
                </Marker>
                {/* Draw line to destination if exists */}
                {hasDest && (
                  <Polyline
                    positions={[
                      [r.lat, r.lng],
                      [r.destinationLat!, r.destinationLng!]
                    ]}
                    color={isSelected ? "#3b82f6" : "#6b7280"}
                    weight={isSelected ? 4 : 2}
                    dashArray={isSelected ? "10, 10" : "5, 5"}
                    opacity={isSelected ? 0.9 : 0.5}
                  />
                )}
                {/* Destination Target Marker */}
                {hasDest && (
                  <CircleMarker
                    center={[r.destinationLat!, r.destinationLng!]}
                    radius={5}
                    pathOptions={{ color: isSelected ? "#3b82f6" : "#6b7280", fillColor: isSelected ? "#3b82f6" : "#6b7280", fillOpacity: 1 }}
                  />
                )}
              </div>
            );
          })}
        </MapContainer>
      </div>

      {/* Incident Details Right Panel */}
      {selectedIncident !== null && (() => {
        const inc = incidents.find((i: Incidents) => i.incidentId === selectedIncident);
        if (!inc) return null;
        return (
          <div className="w-[320px] h-full bg-[#111] border-l border-[#333] z-50 flex flex-col shadow-2xl relative">
            <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#0a0a0a]">
              <h2 className="font-bold text-sm text-gray-400 uppercase tracking-widest">Incident Details</h2>
              <button className="text-gray-500 hover:text-white" onClick={() => setSelectedIncident(null)}>✕</button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="mb-4">
                <span className="font-bold text-blue-400 text-sm uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded">
                  {inc.category}
                </span>
              </div>
              <div className="text-sm text-gray-300 leading-relaxed markdown-override">
                <MarkdownContent content={inc.description} />
              </div>
              
              <div className="mt-6 pt-4 border-t border-[#333]">
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2">Location Data</div>
                <div className="text-xs text-gray-300 font-mono">LAT: {inc.lat.toFixed(6)}</div>
                <div className="text-xs text-gray-300 font-mono mt-1">LNG: {inc.lng.toFixed(6)}</div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-[#333]">
                <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2">Time Reported</div>
                <div className="text-xs text-gray-300 font-mono">{new Date(Number(inc.createdAt)).toLocaleString()}</div>
              </div>
            </div>
            {selectedEntity !== null && (
              <div className="p-4 bg-[#0a0a0a] border-t border-[#333]">
                {dispatchedIncidents[inc.incidentId.toString()] ? (
                  <button 
                    disabled
                    className="w-full bg-green-600/50 text-white font-bold py-3 rounded text-sm cursor-not-allowed"
                  >
                    ✅ DEPLOYED TO INCIDENT
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      handleDestinationSelected(inc.lat, inc.lng);
                      setDispatchedIncidents(prev => ({ ...prev, [inc.incidentId.toString()]: true }));
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded text-sm transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  >
                    DEPLOY SELECTED UNIT HERE
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
