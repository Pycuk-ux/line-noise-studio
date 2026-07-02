import { useCallback, useEffect, useRef } from "react";
import { Slider } from "./index";

// Representative "lines" color for the preview bar (transparency reads over a
// checkerboard). Purely cosmetic — the real mask uses the live gradient colors.
const PREVIEW_RGB = "124,58,237";

const CHECKER: React.CSSProperties = {
  backgroundColor: "#3a3a3a",
  backgroundImage:
    "linear-gradient(45deg,#242424 25%,transparent 25%),linear-gradient(-45deg,#242424 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#242424 75%),linear-gradient(-45deg,transparent 75%,#242424 75%)",
  backgroundSize: "10px 10px",
  backgroundPosition: "0 0,0 5px,5px -5px,-5px 0",
};

export function TransparencyGradient({
  innerOpacity, outerOpacity, innerStop, outerStop, onChange,
}: {
  innerOpacity: number;
  outerOpacity: number;
  innerStop: number;
  outerStop: number;
  onChange: (p: Partial<{ maskInnerOpacity: number; maskOuterOpacity: number; maskInnerStop: number; maskOuterStop: number }>) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<null | "inner" | "outer">(null);

  const applyDrag = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (dragRef.current === "inner") onChange({ maskInnerStop: Math.min(p, outerStop) });
      else if (dragRef.current === "outer") onChange({ maskOuterStop: Math.max(p, innerStop) });
    },
    [innerStop, outerStop, onChange],
  );

  useEffect(() => {
    const move = (e: PointerEvent) => { if (dragRef.current) applyDrag(e.clientX); };
    const up = () => { dragRef.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [applyDrag]);

  // Line opacity (what you see) = 1 - mask transparency, previewed over checker.
  const a = (op: number) => (1 - op).toFixed(3);
  const overlay = `linear-gradient(to right,
    rgba(${PREVIEW_RGB},${a(innerOpacity)}) 0%,
    rgba(${PREVIEW_RGB},${a(innerOpacity)}) ${innerStop * 100}%,
    rgba(${PREVIEW_RGB},${a(outerOpacity)}) ${outerStop * 100}%,
    rgba(${PREVIEW_RGB},${a(outerOpacity)}) 100%)`;

  const Handle = ({ which, pos }: { which: "inner" | "outer"; pos: number }) => (
    <div
      onPointerDown={(e) => { dragRef.current = which; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ } }}
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-3 rounded-[3px] bg-white border border-black/30 shadow cursor-ew-resize"
      style={{ left: `${pos * 100}%` }}
      title={which === "inner" ? "Center stop" : "Edge stop"}
    />
  );

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium tracking-wide text-[var(--label)] uppercase">Transparency gradient</span>
        <span className="text-[11px] text-[var(--subhead)] tabular-nums">{Math.round(innerStop * 100)}% → {Math.round(outerStop * 100)}%</span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-[var(--label)] mb-1">
        <span>center</span><span>edge</span>
      </div>
      <div ref={trackRef} className="relative h-6 rounded-md select-none" style={CHECKER}>
        <div className="absolute inset-0 rounded-md" style={{ background: overlay }} />
        <Handle which="inner" pos={innerStop} />
        <Handle which="outer" pos={outerStop} />
      </div>
      <div className="mt-2">
        <Slider label="Center opacity" value={innerOpacity} min={0} max={1} step={0.01} onChange={(v) => onChange({ maskInnerOpacity: v })} />
        <Slider label="Edge opacity" value={outerOpacity} min={0} max={1} step={0.01} onChange={(v) => onChange({ maskOuterOpacity: v })} />
      </div>
    </div>
  );
}
