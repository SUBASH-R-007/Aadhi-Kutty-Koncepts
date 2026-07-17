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

/**
 * Safe-zone editor: drag to move, drag the corner handle to resize.
 * Coordinates are normalized (0..1) against the template dimensions.
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
    startX: number;
    startY: number;
    zone: Zone;
  } | null>(null);

  const aspect = height / width;

  function pointerDown(e: React.PointerEvent, key: ZoneKey, mode: "move" | "resize") {
    e.preventDefault();
    e.stopPropagation();
    const zone = zones[key];
    if (!zone) return;
    setActive(key);
    drag.current = { key, mode, startX: e.clientX, startY: e.clientY, zone: { ...zone } };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function pointerMove(e: React.PointerEvent) {
    const d = drag.current;
    const el = ref.current;
    if (!d || !el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;
    const z = { ...d.zone };
    if (d.mode === "move") {
      z.x = clamp(d.zone.x + dx, 0, 1 - z.w);
      z.y = clamp(d.zone.y + dy, 0, 1 - z.h);
    } else {
      z.w = clamp(d.zone.w + dx, 0.03, 1 - z.x);
      z.h = clamp(d.zone.h + dy, 0.02, 1 - z.y);
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
        {zoneKeys.map((key) => {
          const zone = zones[key];
          if (!zone) return null;
          const color = zoneColors[key];
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
                backgroundColor: `${color}${active === key ? "33" : "1a"}`,
                zIndex: active === key ? 10 : 1,
              }}
            >
              <span
                className="absolute left-0 top-0 max-w-full truncate px-1 text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {key}
              </span>
              <span
                role="button"
                aria-label={`Resize ${key} zone`}
                onPointerDown={(e) => pointerDown(e, key, "resize")}
                className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize"
                style={{ backgroundColor: color }}
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        Drag a zone to move it; drag its bottom-right corner to resize. Zones:
        title, body (main content), visual (illustration), aadhi (mascot), logo,
        header, footer, page number, source note.
      </p>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}
