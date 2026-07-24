"use client"

import { useEffect } from "react"

// globals.css hard-locks `html, body { overflow: hidden; height: 100% }` for
// the desk scene at "/". This route is a normal scrolling page, so it needs
// to defeat that global rule — inline `overflow: auto` with `!important`
// beats stylesheet-level rules at the same specificity, unlike inline `""`
// which would just fall back to whatever the stylesheet says.
export function UnlockBodyScroll() {
  useEffect(() => {
    // Give scroll to the window (via html) — NOT to body. If body is the
    // scroller, `position: sticky` inside it positions relative to body's
    // internal scroll offset, which visually pushes sticky elements out of
    // view as you scroll. Leaving body at `visible` makes window the
    // scroller and sticky behaves the way people expect.
    document.documentElement.style.setProperty("overflow", "auto", "important")
    document.documentElement.style.setProperty("height", "auto", "important")
    document.body.style.setProperty("overflow", "visible", "important")
    document.body.style.setProperty("height", "auto", "important")
    document.body.style.position = ""
    document.body.style.width = ""
    return () => {
      document.documentElement.style.removeProperty("overflow")
      document.documentElement.style.removeProperty("height")
      document.body.style.removeProperty("overflow")
      document.body.style.removeProperty("height")
    }
  }, [])
  return null
}
