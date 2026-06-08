import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App.tsx';
import { Identity } from 'spacetimedb';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection, ErrorContext } from './module_bindings/index.ts';
import { DEMO_MODE, demoAccount } from './demo.ts';

const HOST = import.meta.env.VITE_SPACETIMEDB_HOST ?? 'ws://localhost:3000';
const DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME ?? 'nyc-pulse';
const TOKEN_KEY = `${HOST}/${DB_NAME}/auth_token`;

const demo = demoAccount(); // null unless DEMO_MODE
// In demo mode always connect as the chosen persona; otherwise use the saved token.
const initialToken = demo ? demo.token : localStorage.getItem(TOKEN_KEY) || undefined;

const onConnect = (_conn: DbConnection, identity: Identity, token: string) => {
  if (!DEMO_MODE) localStorage.setItem(TOKEN_KEY, token);
  console.log(
    'Connected to SpacetimeDB with identity:',
    identity.toHexString()
  );
};

const onDisconnect = () => {
  console.log('Disconnected from SpacetimeDB');
};

const onConnectError = (_ctx: ErrorContext, err: Error) => {
  console.log('Error connecting to SpacetimeDB:', err);
};

const connectionBuilder = DbConnection.builder()
  .withUri(HOST)
  .withDatabaseName(DB_NAME)
  .withToken(initialToken)
  .onConnect(onConnect)
  .onDisconnect(onDisconnect)
  .onConnectError(onConnectError);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SpacetimeDBProvider connectionBuilder={connectionBuilder}>
      {/* Phone frame: centered 430px column on every screen size */}
      <div className="app-frame-outer">
        <div className="app-frame">
          <App />
        </div>
      </div>
    </SpacetimeDBProvider>
  </StrictMode>
);
