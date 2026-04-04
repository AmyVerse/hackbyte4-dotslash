import { useParams, useNavigate } from 'react-router-dom';
import { useTable } from 'spacetimedb/react';
import { motion } from 'framer-motion';
import { tables } from '../module_bindings';

const IncidentDetails = () => {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [incidents] = useTable(tables.incidents);
  const [timelineEvents] = useTable(tables.timeline_events);

  const incident = incidents.find(i => Number(i.incidentId) === Number(incidentId));
  const relatedEvents = timelineEvents
    .filter(e => Number(e.incidentId) === Number(incidentId))
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  if (!incident) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-black text-espresso tracking-tight">Incident Not Found</h2>
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-3 bg-espresso text-white font-bold uppercase tracking-[0.35em] cursor-pointer rounded-sm"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="py-6 md:pt-10 pb-96 max-w-7xl mx-auto w-full px-4 md:px-10">
      <div className="flex items-center gap-4 mb-8 md:mb-12">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center bg-surface border border-espresso/20 rounded-sm hover:bg-espresso hover:text-white transition-colors cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight text-espresso uppercase">
          Incident #{incidentId}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white border border-espresso/20 rounded-sm p-6 md:p-10 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <span className={`px-3 py-1 text-[10px] font-black tracking-[0.3em] text-white rounded-xs border border-white/10 ${
                incident.status === 'active' ? 'bg-terracotta' : 'bg-forest-700'
              }`}>
                {incident.status.toUpperCase()}
              </span>
              <span className="text-[11px] font-black text-espresso/40 tracking-[0.3em] uppercase">
                Category: <span className="text-espresso tracking-normal">{incident.category}</span>
              </span>
            </div>
            
            <h2 className="text-2xl md:text-3xl font-black text-espresso mb-6 leading-tight tracking-tight">
              Tactical Briefing
            </h2>
            <div className="text-lg md:text-xl font-medium text-espresso/80 whitespace-pre-line leading-relaxed tracking-normal">
              {incident.description}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-espresso/40 px-2">Timeline Updates</h3>
            {relatedEvents.map((event, idx) => (
              <motion.div
                key={Number(event.eventId)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-surface border border-espresso/10 border-l-[6px] border-l-espresso rounded-sm p-5 flex justify-between items-start shadow-sm"
              >
                <div>
                  <p className="text-[10px] font-black text-espresso/40 uppercase tracking-[0.35em] mb-1">
                    {new Date(Number(event.timestamp)).toLocaleTimeString()}
                  </p>
                  <p className="font-bold text-espresso">{event.message}</p>
                </div>
                <span className="text-[9px] font-black bg-espresso/5 px-2 py-1 uppercase tracking-tight">
                  {event.eventType}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-espresso text-white p-6 md:p-8 rounded-sm shadow-xl border border-espresso/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 -rotate-45 translate-x-12 -translate-y-12" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.35em] mb-4 opacity-60">Deployment Locale</h3>
            <p className="text-2xl font-black tracking-normal mb-2">{incident.lat.toFixed(6)}</p>
            <p className="text-2xl font-black tracking-normal">{incident.lng.toFixed(6)}</p>
            <div className="mt-8 pt-8 border-t border-white/10">
              <button 
                onClick={() => navigate(`/map?lat=${incident.lat}&lng=${incident.lng}`)}
                className="w-full py-3 bg-white text-espresso font-black text-[12px] tracking-[0.35em] uppercase hover:bg-cream transition-colors cursor-pointer rounded-sm border border-white/10"
              >
                Track Deployment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetails;
