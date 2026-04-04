const About = () => (
  <div className="py-6 md:py-10">
    <h1 className="text-3xl md:text-5xl font-black mb-8 md:mb-16 tracking-tighter text-espresso">User Profile</h1>
    
    <div className="bg-white p-6 md:p-10 flex flex-col sm:flex-row items-center gap-6 md:gap-10 border border-outline/30 mb-8 md:mb-10 text-center sm:text-left">
      <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] bg-espresso text-cream flex items-center justify-center text-4xl md:text-6xl font-black shrink-0">A</div>
      <div>
        <h2 className="text-2xl md:text-3xl font-black text-espresso">Amulya J.</h2>
        <p className="text-[12px] md:text-[14px] font-black uppercase tracking-widest text-espresso/40 mt-1">Verified Responder · NYC Central Host</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 md:gap-5 mb-10 md:mb-16">
      <div className="bg-surface p-6 md:p-10">
        <h3 className="text-4xl md:text-6xl font-black tracking-tighter text-espresso">12</h3>
        <p className="text-[11px] md:text-[13px] font-black uppercase tracking-widest text-espresso/40 mt-1 md:mt-2">Signals Sent</p>
      </div>
      <div className="bg-surface p-6 md:p-10">
        <h3 className="text-4xl md:text-6xl font-black tracking-tighter text-espresso">04</h3>
        <p className="text-[11px] md:text-[13px] font-black uppercase tracking-widest text-espresso/40 mt-1 md:mt-2">Rescues Assigned</p>
      </div>
    </div>

    <div className="px-2">
      <h3 className="text-[12px] md:text-[14px] font-black uppercase tracking-[0.2em] text-espresso/40 mb-3 md:mb-4">About Rescue Link</h3>
      <p className="text-lg md:text-xl font-medium leading-relaxed text-espresso opacity-80">
        A decentralized, real-time response network built on SpacetimeDB to coordinate humanitarian efforts across distributed nodes. 
        Designed for field-ops with minimal latency and editorial precision.
      </p>
    </div>
  </div>
);

export default About;
