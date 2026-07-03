import { useRef, useState } from "react";
import { FONT_STACKS } from "../../defaults";
import { GOOGLE_FONTS, isGoogleFont, loadGoogleFont } from "../../fonts";

const FIELD = "rounded border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--text)]";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium tracking-wide text-[var(--label)] uppercase">{label}</span>
        {hint && <span className="text-[11px] text-[var(--subhead)] tabular-nums">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function Slider({
  label, value, min, max, step = 1, unit = "", onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <Field label={label} hint={`${Number.isInteger(step) ? value : value.toFixed(2)}${unit}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full cursor-pointer"
        style={{ background: `linear-gradient(to right, var(--ctrl-active) ${pct}%, var(--ctrl-bg) ${pct}%)` }}
      />
    </Field>
  );
}

export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 h-8 px-2 text-sm font-mono ${FIELD}`}
        />
      </div>
    </Field>
  );
}

export function Segmented<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-1 rounded-lg bg-[var(--field-bg)] p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              value === o.value ? "bg-[var(--ctrl-active)] text-white" : "text-[var(--label)] hover:text-[var(--subhead)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function Select<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { label: string; value: T }[]; onChange: (v: T) => void }) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`w-full h-8 px-2 text-sm ${FIELD}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label} hint="one line per row">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={`w-full px-2 py-1.5 text-sm resize-y ${FIELD}`}
      />
    </Field>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] font-medium tracking-wide text-[var(--label)] uppercase">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-5 w-9 rounded-full transition ${value ? "bg-[var(--ctrl-active)]" : "bg-[var(--ctrl-bg)]"}`}
      >
        <span
          className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: value ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

export function FontPicker({
  value, extraFonts, onChange,
}: {
  value: string;
  extraFonts: { label: string; value: string }[];
  onChange: (family: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const handle = async (v: string) => {
    const gf = isGoogleFont(v);
    if (gf) {
      setLoading(true);
      await loadGoogleFont(gf);
      setLoading(false);
    }
    onChange(v);
  };
  return (
    <Field label="Font" hint={loading ? "loading…" : undefined}>
      <select
        value={value}
        onChange={(e) => handle(e.target.value)}
        className={`w-full h-8 px-2 text-sm ${FIELD}`}
      >
        <optgroup label="Basic">
          {FONT_STACKS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </optgroup>
        <optgroup label="Google Fonts">
          {GOOGLE_FONTS.map((f) => <option key={f.family} value={f.css}>{f.label}</option>)}
        </optgroup>
        {extraFonts.length > 0 && (
          <optgroup label="Uploaded">
            {extraFonts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        )}
      </select>
    </Field>
  );
}

export function FontUpload({ onLoaded }: { onLoaded: (family: string, label: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const handle = async (file: File) => {
    const family = `custom-${file.name.replace(/[^a-z0-9]/gi, "-")}-${Date.now()}`;
    const buf = await file.arrayBuffer();
    const face = new FontFace(family, buf);
    await face.load();
    document.fonts.add(face);
    onLoaded(`"${family}"`, file.name.replace(/\.[^.]+$/, ""));
  };
  return (
    <div className="mb-3">
      <input
        ref={ref}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f).catch((err) => alert("Font load failed: " + err.message));
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-full h-8 rounded border border-dashed border-[var(--field-border)] bg-[var(--field-bg)] text-xs text-[var(--subhead)] hover:border-[var(--ctrl-active)] hover:text-white transition"
      >
        + Upload font (.ttf / .otf / .woff)
      </button>
    </div>
  );
}
