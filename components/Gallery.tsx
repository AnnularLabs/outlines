"use client";

import { useState, useEffect, useCallback } from "react";
import { works } from "@/data/works";
import type { Work } from "@/lib/types";
import { PhotoPanel } from "./PhotoPanel";
import styles from "./Gallery.module.css";

/* ─── Thumbnail compression ────────────────────────────────── */

const thumbCache = new Map<string, string>();

function useThumb(src: string, thumbWidth = 600, quality = 0.65) {
  const [thumb, setThumb] = useState<string>(() => thumbCache.get(src) ?? "");
  useEffect(() => {
    if (!src) return;
    if (thumbCache.has(src)) { setThumb(thumbCache.get(src)!); return; }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ratio = img.naturalHeight / img.naturalWidth;
      canvas.width = thumbWidth;
      canvas.height = Math.round(thumbWidth * ratio);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      thumbCache.set(src, dataUrl);
      setThumb(dataUrl);
    };
    img.src = src;
  }, [src, thumbWidth, quality]);
  return thumb || src;
}

/* ─── Grid cell ─────────────────────────────────────────────── */

function GridItem({ work, onClick }: { work: Work; onClick: () => void }) {
  const thumb = useThumb(work.image);
  return (
    <button className={styles.item} onClick={onClick} aria-label={work.id}>
      {work.image ? (
        <img src={thumb} alt={work.id} className={styles.img} loading="lazy" decoding="async" />
      ) : (
        <div className={styles.placeholder} />
      )}
      <div className={styles.overlay}>
        <span className={styles.overlayMeta}>{work.year}</span>
      </div>
    </button>
  );
}

/* ─── Static photo display ───────────────────────────────────── */

function PhotoDisplay({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); }, [src]);

  return (
    <div className={styles.lbImgWrap} onClick={onClose}>
      {!loaded && <div className={styles.lbSkeleton} />}
      <img
        key={src}
        src={src}
        alt={alt}
        className={`${styles.lbImg} ${loaded ? styles.lbImgLoaded : ""}`}
        onClick={(e) => e.stopPropagation()}
        onLoad={() => setLoaded(true)}
        draggable={false}
      />
    </div>
  );
}

/* ─── Lightbox ──────────────────────────────────────────────── */

function Lightbox({ work, onClose, onPrev, onNext, total, index }: {
  work: Work; onClose: () => void; onPrev: () => void; onNext: () => void;
  total: number; index: number;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")     onClose();
      if (e.key === "ArrowLeft")  onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [work.id, onClose, onPrev, onNext]);

  return (
    <div className={styles.lightbox}>

      {/* ── left: photo stage ── */}
      <div className={styles.lbStage}>

        {/* blurred atmospheric background */}
        {work.image && (
          <img src={work.image} className={styles.lbBgBlur} aria-hidden alt="" />
        )}

        {/* top bar */}
        <div className={styles.lbBar}>
          <span className={styles.lbCounter}>{index + 1} / {total}</span>
          <button className={styles.lbClose} onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* nav */}
        <button className={`${styles.lbNav} ${styles.lbPrev}`}
          onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous">‹</button>

        {/* main image */}
        {work.image ? (
          <PhotoDisplay src={work.image} alt={work.id} onClose={onClose} />
        ) : (
          <div className={styles.lbPlaceholder} />
        )}

        <button className={`${styles.lbNav} ${styles.lbNext}`}
          onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next">›</button>
      </div>

      {/* ── right: info panel ── */}
      <PhotoPanel work={work} />
    </div>
  );
}

/* ─── Gallery ───────────────────────────────────────────────── */

export function Gallery() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const open  = (i: number) => setActiveIdx(i);
  const close = useCallback(() => setActiveIdx(null), []);
  const prev  = useCallback(() =>
    setActiveIdx((i) => (i === null ? null : (i - 1 + works.length) % works.length)), []);
  const next  = useCallback(() =>
    setActiveIdx((i) => (i === null ? null : (i + 1) % works.length)), []);

  return (
    <>
      <div className={styles.grid}>
        {works.map((work, i) => (
          <GridItem key={work.id} work={work} onClick={() => open(i)} />
        ))}
      </div>
      {activeIdx !== null && (
        <Lightbox
          work={works[activeIdx]} onClose={close} onPrev={prev} onNext={next}
          total={works.length} index={activeIdx}
        />
      )}
    </>
  );
}
