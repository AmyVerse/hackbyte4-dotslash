import { useEffect, useRef } from 'react';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { tables, reducers } from './module_bindings';

function App() {
  // ── SpacetimeDB reactive hooks ─────────────────────────────────────
  const { isActive: connected } = useSpacetimeDB();

  // [rows, isSubscriptionReady] – re-renders automatically on every change
  const [counterRows, isReady] = useTable(tables.demo_counter);

  // Typed reducer caller — just call it like a function
  const incrementCounter = useReducer(reducers.incrementCounter);

  // ── Derive counter value ───────────────────────────────────────────
  const counter = counterRows.find(r => r.id === 0);
  const displayCount = counter ? Number(counter.value) : 0;

  // ── Auto-increment every 1 second ─────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!connected) return; // wait for connection before starting
    intervalRef.current = setInterval(() => {
      incrementCounter();
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connected]); // restart if connection state changes

  // ── Loading state ──────────────────────────────────────────────────
  if (!connected || !isReady) {
    return (
      <div className="app-root">
        <div className="status-badge offline">
          <span className="status-dot" />
          {!connected ? 'Connecting to SpacetimeDB…' : 'Syncing data…'}
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      {/* Connection status badge */}
      <div className="status-badge online">
        <span className="status-dot" />
        Connected to SpacetimeDB
      </div>

      {/* Main card */}
      <div className="card">
        <div className="card-header">
          <span className="db-icon">⚡</span>
          <h1>SpacetimeDB Live Counter</h1>
          <p className="subtitle">Real-time shared state · auto-increments every second</p>
        </div>

        <div className="counter-display">
          {displayCount.toLocaleString()}
        </div>

        <div className="card-footer">
          <button
            className="btn-increment"
            onClick={() => incrementCounter()}
          >
            + Manual Increment
          </button>
          <p className="hint">Auto-increments every 1 s via SpacetimeDB reducer · synced across all clients</p>
        </div>
      </div>
    </div>
  );
}

export default App;

