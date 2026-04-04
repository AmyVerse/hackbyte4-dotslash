import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSpacetimeDB, useTable } from 'spacetimedb/react'
import IncidentReporter from '../components/IncidentReporter'
import MarkdownContent from '../components/MarkdownContent'
import { tables } from '../module_bindings'

const parseAIContent = (content: string = "") => {
  const lines = content.split('\n').filter(l => l.trim() !== "");

  // Try to find a line starting with ### for the title
  let titleIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('### ')) {
      titleIndex = i;
      break;
    }
  }

  // Determine Title and Body
  let title = "Tactical Alert";
  let cleanBodyLines = lines;

  if (titleIndex !== -1) {
    // We have an explicit Markdown title
    title = lines[titleIndex].replace('### ', '').trim();
    cleanBodyLines = lines.filter((_, i) => i !== titleIndex);
  } else if (lines.length > 1) {
    // More than one line and no explicit title, use first as title
    title = lines[0].replace(/[*#]/g, '').trim();
    cleanBodyLines = lines.slice(1);
  } else {
    // Only one line, use it as body, title stays default
    title = "Tactical Alert";
    cleanBodyLines = lines;
  }

  // Extract Hashtags and Severity
  const hashtags = content.match(/#[a-zA-Z0-9]+/g) || [];
  const severityMatch = content.match(/\*\*Severity\*\*:\s*([^\n\r]+)/i);
  const severity = severityMatch ? severityMatch[1].trim() : null;

  const cleanBody = cleanBodyLines
    .join('\n')
    .replace(/\*\*Severity\*\*:\s*.+/i, '')
    .replace(/#[a-zA-Z0-9]+ ?/g, '')
    .trim();

  return { title, hashtags, cleanBody, severity };
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  if (d < 1) return `${(d * 1000).toFixed(0)}m away`;
  return `${d.toFixed(1)}km away`;
};

const Feed = () => {
  const { isActive: connected } = useSpacetimeDB()
  const [incidents = []] = useTable(tables.incidents)

  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string | number, boolean>>({});

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const feedItems = useMemo(() => {
    const incidentItems = [...incidents].map((incident) => ({
      id: `incident-${incident.incidentId}`,
      incidentId: incident.incidentId,
      category: incident.category.toLowerCase(),
      status: incident.status.toLowerCase(),
      location: `${incident.lat.toFixed(6)}, ${incident.lng.toFixed(6)}`,
      lat: incident.lat,
      lng: incident.lng,
      reporter: `COMMAND_NODE_${incident.incidentId}`,
      description: incident.description,
      timestamp: 'TIME NOT RECORDED',
      sortKey: -Number(incident.incidentId),
    }))

    return incidentItems.sort((a, b) => a.sortKey - b.sortKey)
  }, [incidents])


  return (
    <div className="py-6 md:py-7 mx-auto w-full">
      <div className="sticky top-0 z-40 bg-[#fbf9f4] pt-3 pb-3 border-b border-espresso/20 mb-6 md:mb-8 px-2">
        <div className="flex flex-row justify-between items-center gap-2">
          <div className="min-w-0">
            <h1 className="text-xl md:text-5xl font-black tracking-tight text-espresso leading-none truncate overflow-hidden">Live Archive</h1>
            <p className="hidden md:block text-[14px] font-black uppercase tracking-[0.35em] text-espresso/40 mt-2">Real-time Tactical Event Stream</p>
          </div>
          <div className="flex items-center gap-3 md:gap-4 shrink-0 text-right">
            <div className="flex flex-row md:flex-col items-center md:items-end gap-1.5 md:gap-0">
              <p className="text-xl md:text-4xl font-black text-espresso leading-none tracking-normal">{feedItems.length}</p>
              <p className="text-[10px] md:text-[12px] font-black uppercase tracking-[.2em] md:tracking-[0.35em] text-espresso/40">Incidents</p>
              <div className="hidden md:block">
                <p className="text-[10px] md:text-[12px] uppercase tracking-[0.35em] text-emerald-700">{connected ? 'Connected' : 'Disconnected'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-7 items-start px-2">
        <div className="sm:col-span-2 space-y-8 md:space-y-12 min-w-0">
          {feedItems.length === 0 ? (
            <div className="rounded-xs border border-espresso/20 bg-white/80 p-10 text-center text-espresso/60">
              Loading the incident feed...
            </div>
          ) : (
            feedItems.map((item, index) => {
              console.log('Rendering feed item:', item.description)
              const { title, hashtags, cleanBody, severity } = parseAIContent(item.description);
              const isExpanded = expandedDescriptions[item.id] || false;
              const displayBody = cleanBody || item.description;
              const displayTitle = title || "Tactical Alert";

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.45 }}
                  className="bg-white border border-espresso/20 rounded-sm shadow-sm overflow-hidden"
                >
                  {/* Geographic Banner */}
                  <div className="bg-surface/50 border-b border-espresso/5 px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 text-terracotta">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <span className="text-[10px] md:text-[11px] font-black text-espresso/60 uppercase tracking-[0.3em] truncate max-w-[150px] md:max-w-none">
                        {item.location}
                      </span>
                    </div>
                    {userLocation && item.lat !== undefined && item.lng !== undefined && (
                      <span className="text-[9px] md:text-[10px] font-black text-espresso/40 uppercase tracking-[0.2em] bg-espresso/5 px-2 py-1 rounded-xs border border-espresso/10 whitespace-nowrap">
                        {calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4">
                    {/* Left Strategic Data */}
                    <div className="p-5 md:p-8 border-b md:border-b-0 md:border-r border-espresso/10 flex md:flex-col justify-between md:justify-start gap-4 md:space-y-6">
                      <div>
                        <h4 className="text-[9px] md:text-[10px] font-black text-espresso/30 uppercase tracking-[0.3em] mb-1">Incident ID</h4>
                        <p className="text-base md:text-lg font-bold text-espresso tracking-tight">#{item.incidentId}</p>
                      </div>
                      <div>
                        <h4 className="text-[9px] md:text-[10px] font-black text-espresso/30 uppercase tracking-[0.3em] mb-1">Category</h4>
                        <p className="text-base md:text-lg font-bold text-espresso tracking-tight capitalize">{item.category}</p>
                        {severity && (
                          <span className="hidden md:inline-block mt-2 text-[9px] font-black bg-terracotta/10 text-terracotta px-2 py-0.5 rounded-xs border border-terracotta/20 uppercase tracking-[0.2em]">
                            {severity}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[9px] md:text-[10px] font-black text-espresso/30 uppercase tracking-[0.3em] mb-1">Time</h4>
                        <p className="text-base md:text-lg font-bold text-espresso tracking-tight">{item.timestamp}</p>
                      </div>
                    </div>

                    {/* Main Tactical Analysis */}
                    <div className="md:col-span-3 p-5 md:p-8 flex flex-col justify-between">
                      <div>
                        <h2 className="text-xl md:text-3xl font-black text-espresso leading-tight tracking-tight mb-4 md:mb-6">
                          {displayTitle}
                        </h2>

                        <div className={`text-sm md:text-base font-medium text-espresso/80 leading-relaxed transition-all duration-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
                          <MarkdownContent content={displayBody} />
                        </div>

                        {displayBody.length > 200 && (
                          <button
                            onClick={() => setExpandedDescriptions(prev => ({ ...prev, [item.id]: !isExpanded }))}
                            className="mt-3 text-[10px] font-black text-terracotta uppercase tracking-[0.2em] cursor-pointer hover:underline"
                          >
                            {isExpanded ? 'Read Less —' : 'Read Full Brief —'}
                          </button>
                        )}

                        <div className="flex flex-wrap gap-2 mt-6">
                          {hashtags.map(tag => (
                            <span key={tag} className="text-[9px] md:text-[10px] font-black text-espresso/40 uppercase tracking-widest">{tag}</span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-espresso/5 flex flex-wrap gap-4">
                        {item.lat !== undefined && item.lng !== undefined && (
                          <Link
                            to={`/map?lat=${item.lat}&lng=${item.lng}`}
                            className="flex-1 sm:flex-none px-6 md:px-8 py-3 bg-espresso text-white text-[10px] md:text-[11px] font-black tracking-[0.3em] hover:bg-espresso/90 transition-all rounded-sm shadow-md text-center"
                          >
                            TRACK INCIDENT
                          </Link>
                        )}
                        {item.lat !== undefined && item.lng !== undefined && (
                          <Link
                            to={`/incident/${item.incidentId}`}
                            className="flex-1 sm:flex-none px-6 md:px-8 py-3 border border-espresso/20 text-espresso text-[10px] md:text-[11px] font-black tracking-[0.3em] hover:bg-espresso hover:text-white transition-all rounded-sm text-center"
                          >
                            VIEW UPDATES
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right Column: Active Dispatch (Desktop/Tablet only) */}
        <div className="hidden sm:block sm:col-span-1">
          <div className="sticky space-y-8 min-w-0">
            <div className="bg-white/40 backdrop-blur-md border border-espresso/10 rounded-sm p-4 md:px-2 shadow-sm transition-all duration-500 hover:bg-white/60">
              <div className="space-y-12">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.35em] text-espresso/30 mb-6 px-1">Deploy New Signal</h3>
                  <IncidentReporter />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Reporter (Phone only) */}
      <div className="sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[500px] z-3000">
        <div>
          <IncidentReporter />
        </div>
      </div>
    </div>
  )
}

export default Feed;
