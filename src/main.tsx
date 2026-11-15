import React from 'react'
import ReactDOM from 'react-dom/client'
// index.css first, so the shelf's own stylesheet (imported by ShelfApp) wins.
import './index.css'
import ShelfApp from './shelf/ShelfApp'

// The UI inspector is a development tool: it is not in the production bundle.
// src/dev/ is gitignored, so a fresh clone doesn't have it; the glob matches
// nothing then, instead of failing to resolve.
const inspectorModule = import.meta.env.DEV
  ? Object.values(import.meta.glob<{ default: React.ComponentType }>('./dev/Inspector.tsx'))[0]
  : undefined
const Inspector = inspectorModule ? React.lazy(inspectorModule) : null

// /?lookdev: the storyboard's two outline-art looks side by side (temporary).
const LookDev = React.lazy(() => import('./lookdev/LookDev'))
const lookdev = new URLSearchParams(window.location.search).has('lookdev')
// /?objlab=<name>: one object alone, for matching it to its references (temporary).
const ObjLab = React.lazy(() => import('./lookdev/ObjLab'))
const objlab = new URLSearchParams(window.location.search).has('objlab')

// The bookshelf is the whole site. It replaces the Organised/Scattered pages
// and the /room page; their old addresses redirect inside ShelfApp.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {objlab ? (
      <React.Suspense fallback={null}>
        <ObjLab />
      </React.Suspense>
    ) : lookdev ? (
      <React.Suspense fallback={null}>
        <LookDev />
      </React.Suspense>
    ) : (
      <ShelfApp />
    )}
    {Inspector ? (
      <React.Suspense fallback={null}>
        <Inspector />
      </React.Suspense>
    ) : null}
  </React.StrictMode>,
)
