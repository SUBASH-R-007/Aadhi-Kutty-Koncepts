"use client";

import { useRef, useState } from "react";
import type { Zone, Zones, ZoneKey } from "@/lib/content/schemas";
import { zoneKeys } from "@/lib/content/schemas";

const zoneColors: Record<ZoneKey, string> = {
  title: "#4f46e5",
  body: "#0891b2",
  visual: "#059669",
  aadhi: "#d97706",
  logo: "#7c3aed",
  header: "#64748b",
  footer: "#64748b",
  pageNumber: "#dc2626",
  sourceNote: "#92400e",
};

const MIN_W = 0.03;
const MIN_H = 0.02;

/** Resize directions — any combination of edges (n/s/e/w). */
type Dir = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

/** Handle positions + cursors for dynamic, any-direction resizing. */
const handles: { dir: Dir; style: React.CSSProperties; cursor: string }[] = [
  { dir: "nw", style: { left: 0, top: 0 }, cursor: "nwse-resize" },
  { dir: "ne", style: { right: 0, top: 0 }, cursor: "nesw-resize" },
  { dir: "sw", style: { left: 0, bottom: 0 }, cursor: "nesw-resize" },
  { dir: "se", style: { right: 0, bottom: 0 }, cursor: "nwse-resize" },
  { dir: "n", style: { left: "50%", top: 0, transform: "translateX(-50%)" }, cursor: "ns-resize" },
  { dir: "s", style: { left: "50%", bottom: 0, transform: "translateX(-50%)" }, cursor: "ns-resize" },
  { dir: "e", style: { right: 0, top: "50%", transform: "translateY(-50%)" }, cursor: "ew-resize" },
  { dir: "w", style: { left: 0, top: "50%", transform: "translateY(-50%)" }, cursor: "ew-resize" },
];

/**
 * Safe-zone editor: drag to move, drag any edge or corner handle to resize
 * dynamically from any direction. Coordinates are normalized (0..1) against
 * the template dimensions.
 */
export function ZoneEditor({
  zones,
  onChange,
  width,
  height,
  backgroundUrl,
}: {
  zones: Zones;
  onChange: (zones: Zones) => void;
  width: number;
  height: number;
  backgroundUrl?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<ZoneKey | null>(null);
  const drag = useRef<{
    key: ZoneKey;
    mode: "move" | "resize";
    dir?: Dir;
    startX: number;
    startY: number;
    zone: Zone;
  } | null>(null);

  const aspect = height / width;
  // The illustration ("visual") zone is not editable in the template section.
  const editableKeys = zoneKeys.filter((key) => key !== "visual");

  function pointerDown(e: React.PointerEvent, key: ZoneKey, mode: "move" | "resize", dir?: Dir) {
    e.preventDefault();
    e.stopPropagation();
    const zone = zones[key];
    if (!zone) return;
    setActive(key);
    drag.current = { key, mode, dir, startX: e.clientX, startY: e.clientY, zone: { ...zone } };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function pointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;
    const d0 = d.zone;
    let z = { ...d0 };
    if (d.mode === "move") {
      z.x = clamp(d0.x + dx, 0, 1 - d0.w);
      z.y = clamp(d0.y + dy, 0, 1 - d0.h);
    } else {
      const dir = d.dir ?? "se";
      const right = d0.x + d0.w;
      const bottom = d0.y + d0.h;
      let { x, y, w, h } = d0;
      if (dir.includes("e")) w = clamp(d0.w + dx, MIN_W, 1 - d0.x);
      if (dir.includes("s")) h = clamp(d0.h + dy, MIN_H, 1 - d0.y);
      if (dir.includes("w")) {
        x = clamp(d0.x + dx, 0, right - MIN_W);
        w = right - x;
      }
      if (dir.includes("n")) {
        y = clamp(d0.y + dy, 0, bottom - MIN_H);
        h = bottom - y;
      }
      z = { x, y, w, h };
    }
    onChange({ ...zones, [d.key]: z });
  }

  function pointerUp() {
    drag.current = null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        className="relative w-full select-none overflow-hidden rounded-md border border-slate-300 bg-white bg-cover bg-center"
        style={{
          paddingBottom: `${aspect * 100}%`,
          backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        }}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
      >
        {editableKeys.map((key) => {
          const zone = zones[key];
          if (!zone) return null;
          const color = zoneColors[key];
          const isActive = active === key;
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`${key} zone`}
              onPointerDown={(e) => pointerDown(e, key, "move")}
              className="absolute cursor-move rounded-sm border-2"
              style={{
                left: `${zone.x * 100}%`,
                top: `${zone.y * 100}%`,
                width: `${zone.w * 100}%`,
                height: `${zone.h * 100}%`,
                borderColor: color,
                backgroundColor: `${color}${isActive ? "33" : "1a"}`,
                zIndex: isActive ? 10 : 1,
              }}
            >
              <span
                className="absolute left-0 top-0 max-w-full truncate px-1 text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {key}
              </span>
              {handles.map((handle) => (
                <span
                  key={handle.dir}
                  role="button"
                  aria-label={`Resize ${key} zone (${handle.dir})`}
                  onPointerDown={(e) => pointerDown(e, key, "resize", handle.dir)}
                  className="absolute h-2.5 w-2.5 rounded-full border border-white"
                  style={{ ...handle.style, backgroundColor: color, cursor: handle.cursor }}
                />
              ))}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Drag a zone to move it; drag any edge or corner handle to resize it
        dynamically. Zones: title, body (main content), aadhi (mascot), logo,
        header, footer, page number, source note.
      </p>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}
