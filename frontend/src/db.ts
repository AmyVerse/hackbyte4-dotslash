import { DbConnection } from './module_bindings';

const host = import.meta.env.VITE_SPACETIMEDB_HOST ?? 'ws://localhost:3000';
const wsHost = host.replace(/^http/, 'ws');
const dbName = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'rescue-link-db-7jiq3';

// Simple reactive connection-state listeners (no 3rd-party store needed)
type ConnListener = (connected: boolean) => void;
const connListeners: ConnListener[] = [];
export function onConnChange(cb: ConnListener) { connListeners.push(cb); }
export function offConnChange(cb: ConnListener) {
  const i = connListeners.indexOf(cb);
  if (i >= 0) connListeners.splice(i, 1);
}

// Build the SpacetimeDB connection; register lifecycle callbacks on the builder
export const db = DbConnection.builder()
  .withUri(wsHost)
  .withDatabaseName(dbName)
  .onConnect(() => connListeners.forEach(cb => cb(true)))
  .onDisconnect(() => connListeners.forEach(cb => cb(false)))
  .build();
