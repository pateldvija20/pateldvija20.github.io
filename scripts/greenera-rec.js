// Injected into the Greenera prototype by scripts/greenera-video.mjs, never shipped with it.
// Adds what the clips need and a visitor does not: a camera that glides in on the part of
// the screen being used and back out, and a finger dot that travels between taps and presses.
// Coordinates are the prototype's own 393 x 852 screen, whatever the camera is doing.
(() => {
  const stage = document.getElementById('stage')
  const device = document.getElementById('device')
  const CAM_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'

  // The finger: a soft white dot, inside the screen so it zooms with it
  const dot = document.createElement('div')
  Object.assign(dot.style, {
    position: 'absolute', left: '0', top: '0', width: '38px', height: '38px', marginLeft: '-19px', marginTop: '-19px',
    borderRadius: '50%', background: 'rgba(255, 255, 255, 0.78)', boxShadow: '0 2px 12px rgba(19, 25, 16, 0.22), inset 0 0 0 1px rgba(19, 25, 16, 0.06)',
    zIndex: '50', pointerEvents: 'none', opacity: '0', transition: 'opacity 300ms ease, scale 140ms ease-out',
  })
  stage.appendChild(dot)
  let fx = 300, fy = 640
  const place = () => (dot.style.transform = `translate(${fx}px, ${fy}px)`)
  place()

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
  const tween = (ms, step) =>
    new Promise((done) => {
      const t0 = performance.now()
      const frame = (now) => {
        const k = Math.min(1, (now - t0) / ms)
        step(ease(k))
        if (k < 1) requestAnimationFrame(frame)
        else done()
      }
      requestAnimationFrame(frame)
    })
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))

  /** An element's centre in screen coordinates, however the camera has moved the screen. */
  function centre(el) {
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect()
    const k = 393 / s.width
    return [(r.left + r.width / 2 - s.left) * k, (r.top + r.height / 2 - s.top) * k]
  }

  async function moveTo(x, y, ms = 650) {
    dot.style.opacity = '1'
    const sx = fx, sy = fy
    await tween(ms, (e) => {
      fx = sx + (x - sx) * e
      fy = sy + (y - sy) * e
      place()
    })
  }

  /** Travels to an element, presses, and taps it. */
  async function touch(selector, ms = 650) {
    const el = document.querySelector(selector)
    if (!el) throw new Error(`No element for ${selector}`)
    const [x, y] = centre(el)
    await moveTo(x, y, ms)
    await wait(120)
    dot.style.scale = '0.78'
    await wait(140)
    el.click()
    dot.style.scale = '1'
  }

  /** A thumb swipe up: the dot drags while the page scrolls to `to` (screen-space y of the page). */
  async function swipe(screen, to, ms = 1600) {
    const sc = document.querySelector(`#${screen} .scroll`)
    // A list that snaps would pull every frame of the drag back to a row, and snap again
    // where it stops; for the recording it glides and stays where the drag leaves it
    sc.style.scrollSnapType = 'none'
    const from = sc.scrollTop
    const end = Math.min(to, sc.scrollHeight - sc.clientHeight)
    await moveTo(300, 700, 420)
    dot.style.scale = '0.86'
    const sy = fy
    await tween(ms, (e) => {
      sc.scrollTop = from + (end - from) * e
      fy = sy - 300 * e
      place()
    })
    dot.style.scale = '1'
  }

  /** Points the camera at (x, y) on the screen at zoom z. z = 1 is the whole phone. */
  function cam(x, y, z, ms = 900) {
    device.style.transition = `transform ${ms}ms ${CAM_EASE}`
    if (z === 1) {
      device.style.transform = ''
      return wait(ms)
    }
    // Where (x, y) sits on the page with no camera, then the move that brings it to the
    // middle of the window once the device is scaled by z about its own centre.
    const prev = device.style.transform
    device.style.transition = 'none'
    device.style.transform = ''
    const d = device.getBoundingClientRect(), s = stage.getBoundingClientRect()
    device.style.transform = prev
    void device.offsetWidth
    device.style.transition = `transform ${ms}ms ${CAM_EASE}`
    const k = s.width / 393
    const px = s.left + x * k, py = s.top + y * k
    const cx = d.left + d.width / 2, cy = d.top + d.height / 2
    const tx = innerWidth / 2 - cx - z * (px - cx)
    const ty = innerHeight / 2 - cy - z * (py - cy)
    device.style.transform = `translate(${tx}px, ${ty}px) scale(${z})`
    return wait(ms)
  }

  const hide = () => (dot.style.opacity = '0')
  window.__rec = { cam, touch, swipe, moveTo, hide, wait }
})()
