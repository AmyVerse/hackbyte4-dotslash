import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react'
import { tables, reducers } from '../module_bindings'
import type { Incidents } from '../module_bindings/types'

const formatTime = (timestamp: bigint | number) => {
  const date = new Date(Number(timestamp))
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const Feed = () => {
  const { isActive: connected } = useSpacetimeDB()
  const [incidents = []] = useTable(tables.incidents)

  // ── SOS functionality ──────────────────────────────────────────────
  const reportDistress = useReducer(reducers.reportDistress)
  const [isRequestingSOS, setIsRequestingSOS] = useState(false)

  const handleRequestSOS = async () => {
    if (isRequestingSOS) return
    setIsRequestingSOS(true)
    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        })
      })

      await reportDistress({
        severity: 4,
        message: 'Emergency SOS requested from Feed page',
        lat: position.coords.latitude,
        lng: position.coords.longitude
      })
    } catch (error) {
      console.error('Failed to send SOS:', error)
    } finally {
      setIsRequestingSOS(false)
    }
  }

  const feedItems = useMemo(() => {
    const incidentItems = [...incidents].map((incident) => {
      const location = (incident.lat !== undefined && incident.lng !== undefined)
        ? `${incident.lat.toFixed(6)}, ${incident.lng.toFixed(6)}`
        : 'UNKNOWN_COORD'
      return {
        id: Number(incident.incidentId),
        status: incident.status.toUpperCase(),
        category: incident.category.toUpperCase(),
        location,
        description: incident.description,
        timestamp: 'LIVE', // Incidents are ongoing
        reporter: `NODE_${incident.incidentId}`,
        lat: incident.lat,
        lng: incident.lng,
        sortKey: Number(incident.incidentId), // Sort by incident ID for now
      }
    })

    return incidentItems.sort((a, b) => b.sortKey - a.sortKey)
  }, [incidents])

  return (
    <div className="py-6 md:pt-10 pb-96">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 px-2 gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-espresso mb-1 md:mb-2 leading-none">Active Incidents</h1>
          <p className="text-[11px] md:text-[14px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-espresso/40">Live Emergency Response Dashboard</p>
        </div>
        <div className="flex flex-col items-end gap-4">
          <div className="text-left md:text-right">
            <p className="text-2xl md:text-4xl font-black text-espresso leading-none">{feedItems.length}</p>
            <p className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-espresso/40 mt-1">Active Incidents</p>
            <p className="text-[10px] md:text-[12px] uppercase tracking-[0.3em] text-emerald-700 mt-1">{connected ? 'Connected' : 'Disconnected'}</p>
          </div>
          <button
            onClick={handleRequestSOS}
            disabled={isRequestingSOS}
            className="bg-terracotta text-white px-6 py-3 font-black text-sm tracking-widest uppercase shadow-2xl hover:bg-terracotta/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequestingSOS ? 'SENDING SOS...' : '🚨 SOS'}
          </button>
        </div>
      </div>

      <div className="space-y-8 md:space-y-12">
        {feedItems.length === 0 ? (
          <div className="rounded-3xl border border-outline/20 bg-white/80 p-10 text-center text-espresso/60">
            Loading the incident feed...
          </div>
        ) : (
          feedItems.map((signal, index) => (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
              className="group relative"
            >
              <div className="bg-white border border-outline/20 p-5 md:p-8 flex flex-col md:flex-row gap-6 md:gap-10 hover:border-outline/50 transition-all duration-300">
                <div className="w-full md:w-1/4 flex flex-row md:flex-col justify-between border-b md:border-b-0 md:border-r border-outline/20 pb-4 md:pb-0 md:pr-8">
                  <div>
                    <div className={`inline-block px-2 md:px-3 py-0.5 md:py-1 mb-4 md:mb-6 text-[9px] md:text-[10px] font-black tracking-[.2em] border ${signal.status === 'PENDING' ? 'bg-terracotta text-white border-terracotta' :
                      signal.status === 'ASSIGNED' ? 'bg-espresso text-white border-espresso' :
                        signal.status === 'RESOLVED' ? 'bg-forest-700 text-white border-forest-700' :
                          'bg-white text-espresso border-outline'
                      }`}>
                      {signal.status}
                    </div>
                    <h3 className="hidden md:block text-[11px] md:text-[13px] font-bold text-espresso/40 tracking-widest uppercase mb-1">Category</h3>
                    <p className="text-sm md:text-lg font-black text-espresso tracking-tight uppercase md:normal-case">{signal.category}</p>
                  </div>

                  <div className="md:mt-8 text-right md:text-left">
                    <h3 className="hidden md:block text-[11px] md:text-[13px] font-bold text-espresso/40 tracking-widest uppercase mb-1">Time</h3>
                    <p className="text-sm md:text-lg font-black text-espresso tracking-tight">{signal.timestamp}</p>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4 md:mb-6 gap-4">
                    <div>
                      <h3 className="text-[11px] md:text-[13px] font-bold text-espresso/40 tracking-widest uppercase mb-1">Location Coordinates</h3>
                      <p className="text-sm md:text-lg font-black text-espresso tracking-tight">{signal.location}</p>
                    </div>
                    <div className="sm:text-right">
                      <h3 className="text-[11px] md:text-[13px] font-bold text-espresso/40 tracking-widest uppercase mb-1">Reporting Node</h3>
                      <p className="text-sm md:text-lg font-black text-espresso tracking-tight">{signal.reporter}</p>
                    </div>
                  </div>

                  <div className="mt-6 md:mt-10">
                    <h3 className="text-[11px] md:text-[13px] font-bold text-espresso/40 tracking-widest uppercase mb-2 md:mb-4">Detail Description</h3>
                    <p className="text-xl md:text-2xl font-black text-espresso leading-[1.2] md:leading-[1.1] tracking-tighter">
                      {signal.description}
                    </p>
                  </div>

                  <div className="mt-8 md:mt-12 flex flex-col sm:flex-row gap-3 md:gap-4 font-sans font-bold">
                    {signal.lat !== undefined && signal.lng !== undefined ? (
                      <Link
                        to={`/map?lat=${signal.lat}&lng=${signal.lng}`}
                        className="flex-1 sm:flex-none px-6 py-3 bg-espresso text-white text-[11px] md:text-[12px] font-black tracking-[.2em] hover:bg-espresso/90 transition-colors uppercase cursor-pointer text-center"
                      >
                        TRACK
                      </Link>
                    ) : (
                      <button className="flex-1 sm:flex-none px-6 py-3 bg-espresso/50 text-white text-[11px] md:text-[12px] font-black tracking-[.2em] uppercase cursor-not-allowed text-center">
                        TRACKING...
                      </button>
                    )}
                    <button className="flex-1 sm:flex-none px-6 py-3 border border-outline text-espresso text-[11px] md:text-[12px] font-black tracking-[.2em] hover:bg-surface/50 transition-colors uppercase cursor-pointer">
                      REQUEST HELP
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

export default Feed;
