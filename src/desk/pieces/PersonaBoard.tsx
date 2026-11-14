import { useEffect, useRef } from "react";
import { PERSONAS } from "./personaArt";

/**
 * React port of the user's `persona-hero.html` — the four illustrated
 * shopper personas with their interview quotes.
 *
 * Behaviour is kept verbatim from the original vanilla-JS build:
 *  - an idle loop reveals one persona at a time (pills pop in staggered)
 *  - hovering a face pauses the loop, wiggles it, and shows its quotes
 *  - faces are draggable, clamped so the pills never leave the stage
 *  - the 1440x400 stage scales to whatever container it sits in
 */

const DESIGN_W = 1440;
const DESIGN_H = 400;
const AUTOPLAY_INTERVAL = 2400;
const STAGGER = 120;
const MAX_SCALE = 1.2;

const camel = (s: string) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const STYLE = `
.persona-stage { position: relative; width: ${DESIGN_W}px; height: ${DESIGN_H}px; margin: auto; overflow: visible; transform-origin: top center; will-change: transform; }
.persona-person { position: absolute; cursor: grab; touch-action: none; will-change: transform; }
.persona-person.is-dragging { cursor: grabbing; }
.persona-person:hover, .persona-person.is-dragging, .persona-person.is-active { z-index: 10; }
.persona-person svg { display: block; position: relative; z-index: 2; transform-origin: 50% 92%; transition: transform .35s cubic-bezier(.18, 1.35, .32, 1), filter .35s ease; width: 100%; height: auto; user-select: none; -webkit-user-drag: none; pointer-events: none; }
.persona-pill { position: absolute; z-index: 1; display: flex; align-items: center; box-sizing: border-box; padding: 12px; height: 68.84px; border-radius: 12px; font: 700 16px/1.2 'DM Sans', sans-serif; color: #000; text-wrap: pretty; opacity: 0; visibility: hidden; transform: translateY(18px) scale(.88); transition: opacity .28s ease, transform .45s cubic-bezier(.18, 1.35, .32, 1), visibility 0s linear .45s; will-change: transform, opacity; pointer-events: none; }
.persona-person:hover .persona-pill, .persona-person.is-dragging .persona-pill, .persona-person.is-active .persona-pill { opacity: 1; visibility: visible; transform: translateY(0) scale(1); transition-delay: 0s; animation: persona-pop .5s cubic-bezier(.18, 1.35, .32, 1) forwards; }
.persona-person:hover .persona-pill:nth-of-type(2), .persona-person.is-dragging .persona-pill:nth-of-type(2), .persona-person.is-active .persona-pill:nth-of-type(2) { transition-delay: var(--stagger, 120ms); animation-delay: var(--stagger, 120ms); }
.persona-person:hover svg, .persona-person.is-active svg { animation: persona-wiggle .6s cubic-bezier(.18, 1.35, .32, 1) 1; transform: scale(1.08); filter: drop-shadow(0 14px 18px rgba(0, 0, 0, .18)); }
@keyframes persona-wiggle { 0% { transform: scale(1) rotate(0deg); } 22% { transform: scale(1.09) rotate(-3.2deg); } 45% { transform: scale(1.09) rotate(2.6deg); } 68% { transform: scale(1.085) rotate(-1.4deg); } 100% { transform: scale(1.08) rotate(0deg); } }
@keyframes persona-pop { 0% { opacity: 0; transform: translateY(20px) scale(.85); } 60% { opacity: 1; transform: translateY(-4px) scale(1.04); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
@media (prefers-reduced-motion: reduce) { .persona-pill { transition: opacity .2s ease, visibility 0s linear .2s; transform: none; } .persona-person:hover .persona-pill, .persona-person.is-dragging .persona-pill, .persona-person.is-active .persona-pill { animation: none; transform: none; } .persona-person:hover svg, .persona-person.is-active svg { animation: none; transform: none; } }
`;

export function PersonaBoard() {
  const heroRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const frame = frameRef.current;
    const stage = stageRef.current;
    if (!hero || !frame || !stage) return;

    let scale = 1;
    let timer: number | undefined;
    let index = -1;
    let hovering = false;
    let dragging = false;

    const people = Array.from(
      stage.querySelectorAll<HTMLDivElement>(".persona-person"),
    ).map((el) => {
      // Face box + union bounds of its pills, for the drag clamp.
      let minX = 0;
      let minY = 0;
      let maxX = el.offsetWidth;
      let maxY = el.offsetHeight;
      el.querySelectorAll<HTMLDivElement>(".persona-pill").forEach((pill) => {
        minX = Math.min(minX, pill.offsetLeft);
        minY = Math.min(minY, pill.offsetTop);
        maxX = Math.max(maxX, pill.offsetLeft + pill.offsetWidth);
        maxY = Math.max(maxY, pill.offsetTop + pill.offsetHeight);
      });
      return {
        el,
        home: { x: el.offsetLeft, y: el.offsetTop },
        pad: { minX, minY, maxX, maxY },
        tx: 0,
        ty: 0,
      };
    });

    const fit = () => {
      const s = Math.max(0.2, Math.min(MAX_SCALE, (hero.clientWidth || DESIGN_W) / DESIGN_W));
      scale = s;
      stage.style.position = "absolute";
      stage.style.left = "50%";
      stage.style.marginLeft = `${-DESIGN_W / 2}px`;
      stage.style.transform = `scale(${s})`;
      frame.style.height = `${DESIGN_H * s}px`;
    };
    const ro = new ResizeObserver(fit);
    ro.observe(hero);
    fit();

    const clearActive = () =>
      people.forEach((p) => p.el.classList.remove("is-active"));
    const stopLoop = () => {
      window.clearTimeout(timer);
      timer = undefined;
    };
    const pauseLoop = () => {
      hovering = true;
      stopLoop();
      clearActive();
    };
    const startLoop = (delay?: number) => {
      stopLoop();
      if (hovering || dragging || !people.length) return;
      const hold = Math.max(600, AUTOPLAY_INTERVAL);
      const step = () => {
        clearActive();
        timer = window.setTimeout(() => {
          // Short gap so the pop animation restarts.
          index = (index + 1) % people.length;
          people[index].el.classList.add("is-active");
          timer = window.setTimeout(step, hold);
        }, 220);
      };
      timer = window.setTimeout(step, delay ?? 300);
    };

    const startDrag = (e: PointerEvent, p: (typeof people)[number]) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      pauseLoop();
      const startX = e.clientX;
      const startY = e.clientY;
      const ox = p.tx;
      const oy = p.ty;
      p.el.classList.add("is-dragging");
      p.el.setPointerCapture(e.pointerId);

      const move = (ev: PointerEvent) => {
        const s = scale || 1;
        let tx = ox + (ev.clientX - startX) / s;
        let ty = oy + (ev.clientY - startY) / s;
        tx = Math.min(Math.max(tx, -(p.home.x + p.pad.minX)), DESIGN_W - (p.home.x + p.pad.maxX));
        ty = Math.min(Math.max(ty, -(p.home.y + p.pad.minY)), DESIGN_H - (p.home.y + p.pad.maxY));
        p.tx = tx;
        p.ty = ty;
        p.el.style.transform = `translate3d(${tx}px,${ty}px,0)`;
      };
      const up = (ev: PointerEvent) => {
        dragging = false;
        p.el.classList.remove("is-dragging");
        try {
          p.el.releasePointerCapture(ev.pointerId);
        } catch {
          // Pointer already released.
        }
        p.el.removeEventListener("pointermove", move);
        p.el.removeEventListener("pointerup", up);
        p.el.removeEventListener("pointercancel", up);
      };
      p.el.addEventListener("pointermove", move);
      p.el.addEventListener("pointerup", up);
      p.el.addEventListener("pointercancel", up);
    };

    const cleanups: (() => void)[] = [];
    for (const p of people) {
      const down = (e: PointerEvent) => startDrag(e, p);
      const enter = () => pauseLoop();
      const leave = () => {
        hovering = false;
        startLoop(600);
      };
      p.el.addEventListener("pointerdown", down);
      p.el.addEventListener("pointerenter", enter);
      p.el.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        p.el.removeEventListener("pointerdown", down);
        p.el.removeEventListener("pointerenter", enter);
        p.el.removeEventListener("pointerleave", leave);
      });
    }

    startLoop();

    return () => {
      stopLoop();
      ro.disconnect();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div
      ref={heroRef}
      data-no-track-drag
      style={
        {
          width: "100%",
          overflow: "hidden",
          background: "#fdfeff",
          padding: 0,
          display: "block",
          "--stagger": `${STAGGER}ms`,
        } as React.CSSProperties
      }
    >
      <style>{STYLE}</style>
      <div
        ref={frameRef}
        style={{ position: "relative", width: "100%", height: DESIGN_H }}
      >
        <div ref={stageRef} className="persona-stage">
          {PERSONAS.map((persona) => (
            <article
              key={persona.aria}
              className="persona-person"
              style={Object.fromEntries(
                Object.entries(persona.box).map(([k, v]) => [camel(k), v]),
              )}
            >
              {persona.pills.map((pill) => (
                <div
                  key={pill.text}
                  className="persona-pill"
                  style={Object.fromEntries(
                    Object.entries(pill.style).map(([k, v]) => [camel(k), v]),
                  )}
                >
                  {pill.text}
                </div>
              ))}
              <svg
                role="img"
                aria-label={persona.aria}
                viewBox={persona.viewBox}
                fill="none"
                dangerouslySetInnerHTML={{ __html: persona.svg }}
              />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
