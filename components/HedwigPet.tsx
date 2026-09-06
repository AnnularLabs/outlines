"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./HedwigPet.module.css";

const SPRITE_URL = "/hedwig/spritesheet.webp";
const CELL_W = 192;
const CELL_H = 208;
const COLS = 8;
const ROWS = 11;
const LOOK_STEP = 22.5;
const STORAGE_KEY = "hedwig-pet-pos";
const MOBILE_MQ = "(max-width: 720px)";
const DRAG_THRESHOLD = 6;
const LOOK_DEADZONE = 28;

type PetState =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

const STATES: Record<
  PetState,
  { row: number; frames: number; durations: number[] }
> = {
  idle: { row: 0, frames: 6, durations: [280, 110, 110, 140, 140, 320] },
  "running-right": {
    row: 1,
    frames: 8,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
  },
  "running-left": {
    row: 2,
    frames: 8,
    durations: [120, 120, 120, 120, 120, 120, 120, 220],
  },
  waving: { row: 3, frames: 4, durations: [140, 140, 140, 280] },
  jumping: { row: 4, frames: 5, durations: [140, 140, 140, 140, 280] },
  failed: {
    row: 5,
    frames: 8,
    durations: [140, 140, 140, 140, 140, 140, 140, 240],
  },
  waiting: { row: 6, frames: 6, durations: [150, 150, 150, 150, 150, 260] },
  running: { row: 7, frames: 6, durations: [120, 120, 120, 120, 120, 220] },
  review: { row: 8, frames: 6, durations: [150, 150, 150, 150, 150, 280] },
};

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobile() {
  return window.matchMedia(MOBILE_MQ).matches;
}

export function HedwigPet() {
  // Client-only: avoid SSR/client attribute mismatches for this browser pet.
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLButtonElement>(null);
  const spriteRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = rootRef.current;
    const sprite = spriteRef.current;
    if (!root || !sprite) return;

    let state: PetState = "idle";
    let frame = 0;
    let looking = false;
    let lookIndex = 0;
    let animTimer = 0;
    let lastTs = 0;
    let busy = false;
    let pointerX = window.innerWidth * 0.5;
    let pointerY = window.innerHeight * 0.5;
    let dragging = false;
    let didDrag = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let originLeft = 0;
    let originTop = 0;
    let scrollIdleTimer = 0;
    let lastScrollY = window.scrollY;
    let randomTimer = 0;
    let raf = 0;
    let alive = true;

    sprite.style.backgroundImage = `url("${SPRITE_URL}")`;

    function displaySize() {
      return isMobile()
        ? { w: 72, h: Math.round((72 * CELL_H) / CELL_W) }
        : { w: 96, h: Math.round((96 * CELL_H) / CELL_W) };
    }

    function paint() {
      if (!root || !sprite) return;
      const { w, h } = displaySize();
      let row: number;
      let col: number;
      if (looking && !busy && state === "idle") {
        if (lookIndex < 8) {
          row = 9;
          col = lookIndex;
        } else {
          row = 10;
          col = lookIndex - 8;
        }
      } else {
        const cfg = STATES[state];
        row = cfg.row;
        col = frame % cfg.frames;
      }
      sprite.style.backgroundPosition = `${-col * w}px ${-row * h}px`;
    }

    function applySize() {
      if (!root || !sprite) return;
      const { w, h } = displaySize();
      root.style.width = `${w}px`;
      root.style.height = `${h}px`;
      sprite.style.width = `${w}px`;
      sprite.style.height = `${h}px`;
      sprite.style.backgroundSize = `${COLS * w}px ${ROWS * h}px`;
      paint();
    }

    function setState(
      next: PetState,
      options?: { once?: boolean; then?: PetState },
    ) {
      const once = options?.once;
      const then = options?.then ?? "idle";

      if (prefersReducedMotion() && next !== "idle") {
        state = "idle";
        frame = 0;
        looking = false;
        busy = false;
        paint();
        return;
      }

      state = next;
      frame = 0;
      looking = false;
      busy = !!once;
      lastTs = performance.now();
      paint();

      if (once) {
        const cfg = STATES[next];
        const total = cfg.durations
          .slice(0, cfg.frames)
          .reduce((a, b) => a + b, 0);
        window.clearTimeout(animTimer);
        animTimer = window.setTimeout(() => {
          if (!alive) return;
          busy = false;
          setState(then);
        }, total);
      }
    }

    function tick(ts: number) {
      if (!alive) return;
      raf = requestAnimationFrame(tick);
      if (prefersReducedMotion()) {
        frame = 0;
        looking = false;
        paint();
        return;
      }
      if (looking && !busy && state === "idle") {
        paint();
        return;
      }
      const cfg = STATES[state];
      const dur = cfg.durations[frame] || 160;
      if (ts - lastTs < dur) return;
      lastTs = ts;
      frame = (frame + 1) % cfg.frames;
      paint();
    }

    function updateLook() {
      if (
        !root ||
        busy ||
        dragging ||
        prefersReducedMotion() ||
        state !== "idle"
      )
        return;

      const rect = root.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = pointerX - cx;
      const dy = pointerY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < LOOK_DEADZONE) {
        looking = false;
        paint();
        return;
      }

      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      lookIndex = Math.round(deg / LOOK_STEP) % 16;
      looking = true;
      paint();
    }

    function clampToViewport(left: number, top: number) {
      const { w, h } = displaySize();
      const pad = 8;
      const maxL = Math.max(pad, window.innerWidth - w - pad);
      const maxT = Math.max(pad, window.innerHeight - h - pad);
      return {
        left: Math.min(Math.max(pad, left), maxL),
        top: Math.min(Math.max(pad, top), maxT),
      };
    }

    function place(left: number, top: number) {
      if (!root) return { left, top };
      const pos = clampToViewport(left, top);
      root.style.left = `${pos.left}px`;
      root.style.top = `${pos.top}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
      return pos;
    }

    function defaultPosition() {
      const { w, h } = displaySize();
      const inset = isMobile() ? 12 : 20;
      return {
        left: window.innerWidth - w - inset,
        top: window.innerHeight - h - inset,
      };
    }

    function restorePosition() {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as { left?: number; top?: number };
          if (typeof saved.left === "number" && typeof saved.top === "number") {
            place(saved.left, saved.top);
            return;
          }
        }
      } catch {
        /* ignore */
      }
      const d = defaultPosition();
      place(d.left, d.top);
    }

    function savePosition() {
      if (!root) return;
      const left = parseFloat(root.style.left);
      const top = parseFloat(root.style.top);
      if (Number.isFinite(left) && Number.isFinite(top)) {
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
        } catch {
          /* ignore */
        }
      }
    }

    function onPointerMove(e: PointerEvent) {
      pointerX = e.clientX;
      pointerY = e.clientY;
      if (dragging) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) didDrag = true;
        place(originLeft + dx, originTop + dy);
        if (didDrag) {
          const dir: PetState = dx >= 0 ? "running-right" : "running-left";
          if (state !== dir) setState(dir);
        }
        return;
      }
      updateLook();
    }

    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0 || isMobile() || !root) return;
      dragging = true;
      didDrag = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      originLeft = parseFloat(root.style.left) || defaultPosition().left;
      originTop = parseFloat(root.style.top) || defaultPosition().top;
      root.setPointerCapture(e.pointerId);
      root.classList.add(styles.dragging);
    }

    function onPointerUp(e: PointerEvent) {
      if (!dragging || !root) return;
      dragging = false;
      root.classList.remove(styles.dragging);
      try {
        root.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (didDrag) {
        savePosition();
        setState("idle");
        updateLook();
      }
    }

    function onClick(e: MouseEvent) {
      if (didDrag) {
        e.preventDefault();
        didDrag = false;
        return;
      }
      if (busy) return;
      const next: PetState = Math.random() < 0.7 ? "waving" : "jumping";
      setState(next, { once: true });
    }

    function onScroll() {
      if (busy || dragging || prefersReducedMotion()) return;
      const y = window.scrollY;
      const dy = y - lastScrollY;
      lastScrollY = y;
      if (Math.abs(dy) < 8) return;

      const next: PetState = dy > 0 ? "running" : "review";
      if (state !== next) setState(next);
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        if (!busy && !dragging && alive) setState("idle");
      }, 480);
    }

    function scheduleRandom() {
      window.clearTimeout(randomTimer);
      if (prefersReducedMotion()) return;
      const delay = 12000 + Math.random() * 18000;
      randomTimer = window.setTimeout(() => {
        if (!alive) return;
        if (!busy && !dragging && document.visibilityState === "visible") {
          setState(Math.random() < 0.5 ? "waving" : "jumping", { once: true });
        }
        scheduleRandom();
      }, delay);
    }

    function onResize() {
      applySize();
      if (!root) return;
      const left = parseFloat(root.style.left);
      const top = parseFloat(root.style.top);
      if (Number.isFinite(left) && Number.isFinite(top)) {
        place(left, top);
        savePosition();
      } else {
        restorePosition();
      }
    }

    applySize();
    restorePosition();
    paint();

    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    root.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    raf = requestAnimationFrame(tick);
    scheduleRandom();
    if (!prefersReducedMotion()) {
      setState("waving", { once: true });
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(animTimer);
      window.clearTimeout(scrollIdleTimer);
      window.clearTimeout(randomTimer);
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      root.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <button
      ref={rootRef}
      type="button"
      className={styles.pet}
      aria-label="海德薇"
      title="海德薇"
    >
      <span ref={spriteRef} className={styles.sprite} aria-hidden="true" />
    </button>
  );
}
