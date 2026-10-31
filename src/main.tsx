import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// The UI inspector is a development tool: it is not in the production bundle.
const Inspector = import.meta.env.DEV ? React.lazy(() => import('./dev/Inspector')) : null

// /room is the hairline room, a separate page from the current site.
const RoomPage = React.lazy(() => import('./room/RoomPage'))
const isRoom = window.location.pathname.replace(/\/+$/, '') === '/room'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isRoom ? (
      <React.Suspense fallback={null}>
        <RoomPage />
      </React.Suspense>
    ) : (
      <App />
    )}
    {Inspector ? (
      <React.Suspense fallback={null}>
        <Inspector />
      </React.Suspense>
    ) : null}
  </React.StrictMode>,
)
