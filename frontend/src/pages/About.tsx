
const About = () => {
  const settingsButtons = [
    { label: 'Privacy Policy', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
    { label: 'Terms of Service', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { label: 'Language Settings', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129' },
  ];

  return (
    <div className="py-4 md:py-6 pb-20 max-w-7xl mx-auto w-full px-4 md:px-10">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm pt-4 pb-6 border-b border-espresso/10 mb-8 md:mb-10">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-espresso">User Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <div className="bg-white p-5 md:p-8 flex flex-col sm:flex-row items-center gap-5 md:gap-8 border border-espresso/20 rounded-sm shadow-sm">
            <div className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] bg-espresso text-cream flex items-center justify-center text-3xl md:text-5xl font-black shrink-0 rounded-xs border border-espresso/10">
              A
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl md:text-2xl font-black text-espresso tracking-tight">Amulya Yadav</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-espresso/30">Contact:</span>
                  <span className="text-xs font-bold text-espresso">+91 XXXXX XXXXX</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-espresso/30">DOB:</span>
                  <span className="text-xs font-bold text-espresso">15-08-19XX</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-espresso/30">Address:</span>
                  <span className="text-xs font-bold text-espresso truncate max-w-[200px]">Civil Lines, Nagpur, MH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-espresso/10 rounded-sm p-5 md:p-8 shadow-sm relative overflow-hidden">
              <h3 className="text-3xl md:text-5xl font-black tracking-normal text-espresso">12</h3>
              <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-espresso/40 mt-1 md:mt-2">Signals Sent</p>
            </div>
            <div className="bg-surface border border-espresso/10 rounded-sm p-5 md:p-8 shadow-sm relative overflow-hidden">
              <h3 className="text-3xl md:text-5xl font-black tracking-normal text-espresso">04</h3>
              <p className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-espresso/40 mt-1 md:mt-2">Rescued as Volunteer</p>
            </div>
          </div>

          {/* Volunteer Application */}
          <div className="bg-white border border-espresso/10 rounded-sm p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 border-l-[6px] border-l-terracotta">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-espresso">Volunteer Program</h3>
              <p className="text-xs text-espresso/60 mt-1">Contribute to field-ops and emergency response missions.</p>
            </div>
            <button className="px-6 py-2 bg-terracotta text-white text-[10px] font-black tracking-[0.3em] uppercase hover:bg-terracotta/90 transition-all rounded-sm shadow-sm cursor-pointer whitespace-nowrap">
              Apply for Volunteer
            </button>
          </div>
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-4">
          <div className="bg-white/50 backdrop-blur-sm border border-espresso/10 rounded-sm p-6 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-espresso/40 mb-6 border-b border-espresso/5 pb-4">Settings & Legal</h3>
            <div className="space-y-2">
              {settingsButtons.map((btn) => (
                <button
                  key={btn.label}
                  className="w-full flex items-center justify-between p-3 border border-espresso/5 rounded-xs hover:bg-espresso hover:text-white transition-all group cursor-pointer"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">{btn.label}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100">
                    <path d={btn.icon} />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-espresso/40 mb-3">System Context</h3>
            <p className="text-xs font-medium leading-relaxed text-espresso/70 tracking-normal">
              Rescue Link v2.4.0-Tactical.
              Distributed Node Network enabled.
              SpacetimeDB kernel active.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-espresso/10 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-espresso/30 mb-2">Rescue Link · Tactical Response Network</p>
          <p className="text-[9px] font-medium text-espresso/40 leading-relaxed max-w-lg mx-auto">
            A high-performance situational awareness platform designed for low-latency emergency orchestration.
            Built with uncompromising precision for field-ops.
          </p>
          <p className="text-[9px] font-black text-espresso/20 mt-6 tracking-[0.2em]">© 2026 AMYVERSE INC. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
