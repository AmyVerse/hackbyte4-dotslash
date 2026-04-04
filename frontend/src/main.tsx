import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { SpacetimeDBProvider } from 'spacetimedb/react'
import { DbConnection, type ErrorContext } from './module_bindings/index'
import { Identity } from 'spacetimedb'

const HOST    = import.meta.env.VITE_SPACETIMEDB_HOST    ?? 'ws://localhost:3000'
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'rescue-link-db-7jiq3'
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`

function Root() {
  // Memoize so we never recreate the connection on re-render
  const connectionBuilder = useMemo(
    () =>
      DbConnection.builder()
        .withUri(HOST)
        .withDatabaseName(DB_NAME)
        .withToken(localStorage.getItem(TOKEN_KEY) || undefined)
        .onConnect((_conn: DbConnection, identity: Identity, token: string) => {
          localStorage.setItem(TOKEN_KEY, token)
          console.log('[SpacetimeDB] Connected:', identity.toHexString())
        })
        .onDisconnect(() => console.log('[SpacetimeDB] Disconnected'))
        .onConnectError((_ctx: ErrorContext, err: Error) =>
          console.error('[SpacetimeDB] Connect error:', err)
        ),
    []
  )

  return (
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SpacetimeDBProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <Root />
)
