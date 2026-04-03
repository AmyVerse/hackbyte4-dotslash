import { StrictMode, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection, type ErrorContext } from './module_bindings/index.ts';
import type { Identity } from 'spacetimedb';
import './index.css';
import App from './App.tsx';

const HOST = import.meta.env.VITE_SPACETIMEDB_HOST ?? 'ws://localhost:3000';
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'rescue-link-db-7jiq3';
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

// Wrap in a component so useMemo is valid React hook usage
function Root() {
  // MUST be memoized — inline builder object causes reconnect every render
  const connectionBuilder = useMemo(() =>
    DbConnection.builder()
      .withUri(HOST)
      .withDatabaseName(DB_NAME)
      .withToken(localStorage.getItem(TOKEN_KEY) || undefined)
      .onConnect((_conn: DbConnection, identity: Identity, token: string) => {
        localStorage.setItem(TOKEN_KEY, token);
        console.log('Connected:', identity.toHexString());
      })
      .onDisconnect(() => console.log('Disconnected from SpacetimeDB'))
      .onConnectError((_ctx: ErrorContext, err: Error) => console.error('Connection error:', err)),
  []); // empty deps — build once

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <App />
    </SpacetimeDBProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
