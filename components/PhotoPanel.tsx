"use client";

import { useEffect, useRef, useState } from "react";
import type { Work } from "@/lib/types";
import styles from "./PhotoPanel.module.css";

/* ─── Types ─────────────────────────────────────────────────── */

interface FileMeta {
  filename: string;
  format: string;
  width: number;
  height: number;
  fileSize: number | null;
  software: string;
}

interface ToneAnalysis {
  toneType: string;
  brightness: number;
  contrast: number;
  shadowRatio: number;
  highlightRatio: number;
  r: Uint32Array;
  g: Uint32Array;
  b: Uint32Array;
  luma: Uint32Array;
}

interface ExifData {
  // Capture
  focalLength?: number;
  focalLength35mm?: number;
  fNumber?: number;
  exposureTime?: number;
  iso?: number;
  // Device
  make?: string;
  model?: string;
  lensModel?: string;
  maxAperture?: number;
  // Mode
  exposureProgram?: number;
  exposureMode?: number;
  meteringMode?: number;
  whiteBalance?: number;
  flash?: number;
  lightSource?: number;
  sceneCaptureType?: number;
  // Technical
  brightnessValue?: number;
  shutterSpeedValue?: number;
  apertureValue?: number;
  sensingMethod?: number;
  focalPlaneXResolution?: number;
  focalPlaneYResolution?: number;
  focalPlaneResolutionUnit?: number;
  software?: string;
}

/* ─── Lookup tables ─────────────────────────────────────────── */

const EXPOSURE_PROGRAM: Record<number, string> = {
  0: "Not Defined", 1: "Manual", 2: "Program AE",
  3: "Aperture Priority", 4: "Shutter Priority",
  5: "Creative (Slow)", 6: "Action (Fast)", 7: "Portrait", 8: "Landscape",
};
const EXPOSURE_MODE: Record<number, string> = {
  0: "Auto", 1: "Manual", 2: "Auto Bracket",
};
const METERING_MODE: Record<number, string> = {
  0: "Unknown", 1: "Average", 2: "Center-weighted",
  3: "Spot", 4: "Multi-spot", 5: "Pattern", 6: "Partial",
};
const WHITE_BALANCE: Record<number, string> = { 0: "Auto", 1: "Manual" };
const SCENE_CAPTURE: Record<number, string> = {
  0: "Standard", 1: "Landscape", 2: "Portrait", 3: "Night",
};
const SENSING_METHOD: Record<number, string> = {
  1: "Not Defined", 2: "One-chip Color Area", 3: "Two-chip Color Area",
  4: "Three-chip Color Area", 5: "Color Sequential Area",
  7: "Trilinear", 8: "Color Sequential Linear",
};
const RESOLUTION_UNIT: Record<number, string> = { 2: "dpi", 3: "dpcm" };

/* ─── Formatters ────────────────────────────────────────────── */

function fmtShutter(t?: number): string {
  if (t == null) return "—";
  if (t >= 1) return `${t}s`;
  return `1/${Math.round(1 / t)}s`;
}
function fmtAperture(f?: number): string {
  return f != null ? `f/${f.toFixed(1)}` : "—";
}
function fmtMM(mm?: number): string {
  return mm != null ? `${mm}mm` : "—";
}
function fmtFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
function fmtPixels(w: number, h: number): string {
  const mp = (w * h) / 1_000_000;
  return `${mp.toFixed(1)} MP`;
}
function fmtFlash(v?: number): string {
  if (v == null) return "—";
  return v & 1 ? "Fired" : "Did not fire";
}
function fmtResolution(x?: number, unit?: number): string {
  if (x == null) return "—";
  const u = unit != null ? RESOLUTION_UNIT[unit] ?? "" : "";
  return `${x.toFixed(0)} ${u}`.trim();
}
function classifyTone(avg: number): string {
  if (avg < 64)  return "Low Key";
  if (avg < 96)  return "Low Midtone";
  if (avg < 160) return "Midtone";
  if (avg < 192) return "High Midtone";
  return "High Key";
}

/* ─── Histogram canvas ──────────────────────────────────────── */

function Histogram({ r, g, b, luma }: Pick<ToneAnalysis, "r" | "g" | "b" | "luma">) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // detect theme for luma channel color
    const isDark = document.documentElement.getAttribute("data-theme") === "dark"
      || (!document.documentElement.getAttribute("data-theme")
          && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const lumaColor = isDark ? "#aaaaaa" : "#333333";

    ctx.clearRect(0, 0, W, H);

    const maxVal = Math.max(
      ...Array.from(luma).slice(0, 256),
      ...Array.from(r).slice(0, 256),
      ...Array.from(g).slice(0, 256),
      ...Array.from(b).slice(0, 256),
    );
    if (maxVal === 0) return;

    function drawChannel(data: Uint32Array, color: string, alpha: number) {
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = color;
      ctx!.beginPath();
      ctx!.moveTo(0, H);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * W;
        const y = H - (data[i] / maxVal) * H;
        ctx!.lineTo(x, y);
      }
      ctx!.lineTo(W, H);
      ctx!.closePath();
      ctx!.fill();
    }

    // luma as base (theme-aware)
    drawChannel(luma, lumaColor, isDark ? 0.55 : 0.4);
    // RGB overlay
    drawChannel(r, "#ff4444", 0.35);
    drawChannel(g, "#44cc44", 0.35);
    drawChannel(b, "#4488ff", 0.35);

    ctx.globalAlpha = 1;
  }, [r, g, b, luma]);

  return <canvas ref={ref} width={256} height={72} className={styles.histCanvas} />;
}

/* ─── Section + Row primitives ──────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.rows}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value ?? "—"}</span>
    </div>
  );
}

/* ─── Main panel ────────────────────────────────────────────── */

export function PhotoPanel({ work }: { work: Work }) {
  const [fileMeta, setFileMeta]   = useState<FileMeta | null>(null);
  const [tone, setTone]           = useState<ToneAnalysis | null>(null);
  const [exif, setExif]           = useState<ExifData | null>(null);

  useEffect(() => {
    if (!work.image) { setFileMeta(null); setTone(null); setExif(null); return; }
    setFileMeta(null); setTone(null); setExif(null);

    const url = work.image;

    // 1. Load image → dimensions + tone analysis
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      const ext = url.split(".").pop()?.toUpperCase() ?? "JPEG";

      // File size via HEAD
      fetch(url, { method: "HEAD" })
        .then((r) => parseInt(r.headers.get("content-length") ?? "0") || null)
        .catch(() => null)
        .then((fileSize) => {
          // Tone analysis via canvas
          const SAMPLE = 400;
          const ratio = H / W;
          const sw = SAMPLE;
          const sh = Math.round(SAMPLE * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = sw; canvas.height = sh;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, sw, sh);
          const data = ctx.getImageData(0, 0, sw, sh).data;

          const rArr = new Uint32Array(256);
          const gArr = new Uint32Array(256);
          const bArr = new Uint32Array(256);
          const lumaArr = new Uint32Array(256);

          let totalLuma = 0;
          let shadows = 0;
          let highlights = 0;
          const total = (sw * sh);

          for (let i = 0; i < data.length; i += 4) {
            const rv = data[i], gv = data[i + 1], bv = data[i + 2];
            const lv = Math.round(0.299 * rv + 0.587 * gv + 0.114 * bv);
            rArr[rv]++; gArr[gv]++; bArr[bv]++; lumaArr[lv]++;
            totalLuma += lv;
            if (lv < 64)  shadows++;
            if (lv > 192) highlights++;
          }

          const avgBrightness = totalLuma / total;

          // Contrast = std-dev of luma
          let variance = 0;
          for (let i = 0; i < data.length; i += 4) {
            const rv = data[i], gv = data[i + 1], bv = data[i + 2];
            const lv = 0.299 * rv + 0.587 * gv + 0.114 * bv;
            variance += (lv - avgBrightness) ** 2;
          }
          const contrast = Math.sqrt(variance / total);

          setFileMeta({ filename: url.split("/").pop() ?? url, format: ext, width: W, height: H, fileSize, software: "" });
          setTone({
            toneType: classifyTone(avgBrightness),
            brightness: Math.round(avgBrightness),
            contrast: Math.round(contrast),
            shadowRatio: parseFloat(((shadows / total) * 100).toFixed(1)),
            highlightRatio: parseFloat(((highlights / total) * 100).toFixed(1)),
            r: rArr, g: gArr, b: bArr, luma: lumaArr,
          });
        });
    };
    img.src = url;

    // 2. Parse EXIF
    import("exifr").then(({ default: exifr }) =>
      exifr.parse(url, {
        pick: [
          "FocalLength","FocalLengthIn35mmFilm","FNumber","ExposureTime","ISO","ISOSpeedRatings",
          "Make","Model","LensModel","MaxApertureValue",
          "ExposureProgram","ExposureMode","MeteringMode","WhiteBalance","Flash","LightSource","SceneCaptureType",
          "BrightnessValue","ShutterSpeedValue","ApertureValue","SensingMethod",
          "FocalPlaneXResolution","FocalPlaneYResolution","FocalPlaneResolutionUnit","Software",
        ],
      })
    ).then((raw) => {
      if (!raw) return;
      setExif({
        focalLength: raw.FocalLength,
        focalLength35mm: raw.FocalLengthIn35mmFilm,
        fNumber: raw.FNumber,
        exposureTime: raw.ExposureTime,
        iso: raw.ISO ?? raw.ISOSpeedRatings,
        make: raw.Make,
        model: raw.Model,
        lensModel: raw.LensModel,
        maxAperture: raw.MaxApertureValue,
        exposureProgram: raw.ExposureProgram,
        exposureMode: raw.ExposureMode,
        meteringMode: raw.MeteringMode,
        whiteBalance: raw.WhiteBalance,
        flash: raw.Flash,
        lightSource: raw.LightSource,
        sceneCaptureType: raw.SceneCaptureType,
        brightnessValue: raw.BrightnessValue,
        shutterSpeedValue: raw.ShutterSpeedValue,
        apertureValue: raw.ApertureValue,
        sensingMethod: raw.SensingMethod,
        focalPlaneXResolution: raw.FocalPlaneXResolution,
        focalPlaneYResolution: raw.FocalPlaneYResolution,
        focalPlaneResolutionUnit: raw.FocalPlaneResolutionUnit,
        software: raw.Software,
      });
    }).catch(() => {});

  }, [work.id, work.image]);

  if (!work.image) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>No photo loaded</div>
      </div>
    );
  }

  const camera = [exif?.make, exif?.model].filter(Boolean).join(" ") || "—";
  const software = exif?.software ?? fileMeta?.software ?? "—";

  return (
    <div className={styles.panel}>

      <Section title="Basic Information">
        <Row label="Filename"   value={fileMeta?.filename} />
        <Row label="Format"     value={fileMeta?.format} />
        <Row label="Dimensions" value={fileMeta ? `${fileMeta.width} × ${fileMeta.height}` : undefined} />
        <Row label="File Size"  value={fileMeta ? fmtFileSize(fileMeta.fileSize) : undefined} />
        <Row label="Pixels"     value={fileMeta ? fmtPixels(fileMeta.width, fileMeta.height) : undefined} />
        <Row label="Software"   value={software !== "—" ? software : undefined} />
      </Section>

      <Section title="Capture Parameters">
        <Row label="Focal Length" value={exif ? fmtMM(exif.focalLength) : undefined} />
        <Row label="Aperture"     value={exif ? fmtAperture(exif.fNumber) : undefined} />
        <Row label="Shutter"      value={exif ? fmtShutter(exif.exposureTime) : undefined} />
        <Row label="ISO"          value={exif?.iso?.toString()} />
      </Section>

      <Section title="Tone Analysis">
        <Row label="Tone Type"       value={tone?.toneType} />
        <Row label="Brightness"      value={tone ? `${tone.brightness} / 255` : undefined} />
        <Row label="Contrast"        value={tone ? `${tone.contrast} σ` : undefined} />
        <Row label="Shadow Ratio"    value={tone ? `${tone.shadowRatio}%` : undefined} />
        <Row label="Highlight Ratio" value={tone ? `${tone.highlightRatio}%` : undefined} />
      </Section>

      <Section title="Histogram">
        {tone ? (
          <Histogram r={tone.r} g={tone.g} b={tone.b} luma={tone.luma} />
        ) : (
          <div className={styles.skeletonHist} />
        )}
      </Section>

      <Section title="Device Information">
        <Row label="Camera"      value={exif ? camera : undefined} />
        <Row label="Lens"        value={exif?.lensModel} />
        <Row label="Focal (35mm)"value={exif ? fmtMM(exif.focalLength35mm) : undefined} />
        <Row label="Max Aperture"value={exif?.maxAperture != null ? `f/${(Math.pow(Math.SQRT2, exif.maxAperture)).toFixed(1)}` : undefined} />
      </Section>

      <Section title="Capture Mode">
        <Row label="Exposure Program" value={exif?.exposureProgram != null ? EXPOSURE_PROGRAM[exif.exposureProgram] : undefined} />
        <Row label="Exposure Mode"    value={exif?.exposureMode != null ? EXPOSURE_MODE[exif.exposureMode] : undefined} />
        <Row label="Metering Mode"    value={exif?.meteringMode != null ? METERING_MODE[exif.meteringMode] : undefined} />
        <Row label="White Balance"    value={exif?.whiteBalance != null ? WHITE_BALANCE[exif.whiteBalance] : undefined} />
        <Row label="Flash"            value={exif ? fmtFlash(exif.flash) : undefined} />
        <Row label="Scene Type"       value={exif?.sceneCaptureType != null ? SCENE_CAPTURE[exif.sceneCaptureType] : undefined} />
      </Section>

      <Section title="Technical Parameters">
        <Row label="Brightness Value"  value={exif?.brightnessValue?.toFixed(2)} />
        <Row label="Shutter Speed EV"  value={exif?.shutterSpeedValue?.toFixed(2)} />
        <Row label="Aperture Value EV" value={exif?.apertureValue?.toFixed(2)} />
        <Row label="Sensing Method"    value={exif?.sensingMethod != null ? SENSING_METHOD[exif.sensingMethod] : undefined} />
        <Row label="Focal Plane X Res" value={exif ? fmtResolution(exif.focalPlaneXResolution, exif.focalPlaneResolutionUnit) : undefined} />
        <Row label="Focal Plane Y Res" value={exif ? fmtResolution(exif.focalPlaneYResolution, exif.focalPlaneResolutionUnit) : undefined} />
      </Section>

    </div>
  );
}
