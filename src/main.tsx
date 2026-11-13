import React from 'react'
import ReactDOM from 'react-dom/client'
// index.css first, so the shelf's own stylesheet (imported by ShelfApp) wins.
import './index.css'
import ShelfApp from './shelf/ShelfApp'

// The UI inspector is a development tool: it is not in the production bundle.
const Inspector = import.meta.env.DEV ? React.lazy(() => import('./dev/Inspector')) : null

// The bookshelf is the whole site. It replaces the Organised/Scattered pages
// and the /room page; their old addresses redirect inside ShelfApp.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ShelfApp />
    {Inspector ? (
      <React.Suspense fallback={null}>
        <Inspector />
      </React.Suspense>
    ) : null}
  </React.StrictMode>,
)
