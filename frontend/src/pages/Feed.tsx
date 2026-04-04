import { motion } from 'framer-motion';

const signals = [
  {
    id: 1,
    category: 'MEDICAL',
    status: 'URGENT',
    location: '40.7128° N, 74.0060° W',
    description: 'Multiple casualties reported near central hub. Immediate medical extraction required. Responder units alpha and beta dispatched.',
    timestamp: '14:32:05',
    reporter: 'SIGNAL_BOT_04'
  },
  {
    id: 2,
    category: 'EXTRACTION',
    status: 'ACTIVE',
    location: '40.7589° N, 73.9851° W',
    description: 'Unit Alpha-9 initiating extraction protocol. Perimeter secured by tactical-4. Estimated completion in 08:30 minutes.',
    timestamp: '14:28:44',
    reporter: 'ALPHA_LEAD'
  },
  {
    id: 3,
    category: 'SUPPLY_DROP',
    status: 'LOGISTICS',
    location: '40.7829° N, 73.9654° W',
    description: 'Food and water supplies dropped at sector 7. Local responders notified of arrival. Storage facility established.',
    timestamp: '14:15:22',
    reporter: 'LOGS_COORD'
  },
  {
    id: 4,
    category: 'FIRE_CONTAINMENT',
    status: 'RESOLVED',
    location: '40.7061° N, 74.0092° W',
    description: 'Structural fire at warehouse 12 contained. No civilian injuries reported. Structural integrity team assessing damage.',
    timestamp: '13:45:10',
    reporter: 'FIRE_CREW_01'
  }
];

const Feed = () => {
  return (
    <div className="py-6 md:py-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 px-2 gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-espresso mb-1 md:mb-2 leading-none">Live Archive</h1>
          <p className="text-[11px] md:text-[14px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-espresso/40">Real-time Tactical Event Stream</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-2xl md:text-4xl font-black text-espresso leading-none">42</p>
          <p className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-espresso/40 mt-1">Active Signals</p>
        </div>
      </div>

      <div className="space-y-8 md:space-y-12">
        {signals.map((signal, index) => (
          <motion.div
            key={signal.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="group relative"
          >
            {/* Editorial Card Layout */}
            <div className="bg-white border border-outline/20 p-5 md:p-8 flex flex-col md:flex-row gap-6 md:gap-10 hover:border-outline/50 transition-all duration-300">
              
              {/* Metadata Sidebar */}
              <div className="w-full md:w-1/4 flex flex-row md:flex-col justify-between border-b md:border-b-0 md:border-r border-outline/20 pb-4 md:pb-0 md:pr-8">
                <div>
                  <div className={`inline-block px-2 md:px-3 py-0.5 md:py-1 mb-4 md:mb-6 text-[9px] md:text-[10px] font-black tracking-[.2em] border ${
                    signal.status === 'URGENT' ? 'bg-terracotta text-white border-terracotta' : 
                    signal.status === 'ACTIVE' ? 'bg-espresso text-white border-espresso' : 
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

              {/* Main Content Area */}
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
                  <h3 className="text-[11px] md:text-[13px] font-bold text-espresso/40 tracking-widest uppercase mb-2 md:mb-4">Signal Description</h3>
                  <p className="text-xl md:text-2xl font-black text-espresso leading-[1.2] md:leading-[1.1] tracking-tighter">
                    {signal.description}
                  </p>
                </div>

                <div className="mt-8 md:mt-12 flex flex-col sm:flex-row gap-3 md:gap-4 font-sans font-bold">
                  <button className="flex-1 sm:flex-none px-6 py-3 bg-espresso text-white text-[11px] md:text-[12px] font-black tracking-[.2em] hover:bg-espresso/90 transition-colors uppercase cursor-pointer">
                    Intervene
                  </button>
                  <button className="flex-1 sm:flex-none px-6 py-3 border border-outline text-espresso text-[11px] md:text-[12px] font-black tracking-[.2em] hover:bg-surface/50 transition-colors uppercase cursor-pointer">
                    Request Intel
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Feed;
