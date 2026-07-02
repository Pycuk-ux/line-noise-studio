import type { Settings, SettingsPatch, Alignment } from "../types";
import { FONT_STACKS, ASPECT_PRESETS } from "../defaults";
import { Slider, ColorInput, Segmented, Select, TextArea, Toggle, FontUpload } from "./controls";
import type { VideoFormat } from "../export/exporter";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--field-border)] py-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--subhead)] mb-3">{title}</h2>
      {children}
    </section>
  );
}

export function ControlPanel({
  s, update, onExportPng, onExportVideo, exporting, progress, canMp4, extraFonts, onFontLoaded,
}: {
  s: Settings;
  update: (p: SettingsPatch) => void;
  onExportPng: () => void;
  onExportVideo: (f: VideoFormat) => void;
  exporting: boolean;
  progress: number;
  canMp4: boolean;
  extraFonts: { label: string; value: string }[];
  onFontLoaded: (family: string, label: string) => void;
}) {
  const fontOptions = [...FONT_STACKS, ...extraFonts];

  return (
    <div className="h-full overflow-y-auto px-4 pb-8">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-[var(--bg)]/95 backdrop-blur border-b border-[var(--field-border)]">
        <h1 className="font-bold text-white" style={{ fontSize: "21px", letterSpacing: "-0.02em" }}>Line Noise Studio</h1>
        <p className="text-[11px] text-[var(--label)]">Animated gradient lines · noise · text · export</p>
      </div>

      <Section title="Canvas">
        <Select
          label="Preset"
          value={`${s.width}x${s.height}`}
          options={ASPECT_PRESETS.map((p) => ({ label: p.label, value: `${p.width}x${p.height}` }))}
          onChange={(v) => {
            const [w, h] = v.split("x").map(Number);
            update({ width: w, height: h });
          }}
        />
      </Section>

      <Section title="Lines">
        <Slider label="Rows" value={s.barCount} min={1} max={60} onChange={(v) => update({ barCount: v })} />
        <Slider label="Cells per row" value={s.cellDensity} min={1} max={20} step={0.5} onChange={(v) => update({ cellDensity: v })} />
        <Slider label="Thickness (row fill)" value={s.barThickness} min={0.05} max={1} step={0.01} onChange={(v) => update({ barThickness: v })} />
        <Slider label="Width" value={s.barWidth} min={0.1} max={1} step={0.01} onChange={(v) => update({ barWidth: v })} />
        <Slider label="Angle X (shear)" value={s.angleX} min={-60} max={60} unit="°" onChange={(v) => update({ angleX: v })} />
        <Slider label="Angle Y (rotate)" value={s.angleY} min={-45} max={45} unit="°" onChange={(v) => update({ angleY: v })} />
        <ColorInput label="Gradient A" value={s.colorA} onChange={(v) => update({ colorA: v })} />
        <ColorInput label="Gradient B" value={s.colorB} onChange={(v) => update({ colorB: v })} />
        <Slider label="Gradient frequency" value={s.gradFreq} min={0.25} max={4} step={0.05} onChange={(v) => update({ gradFreq: v })} />
        <Slider label="Opacity" value={s.barOpacity} min={0} max={1} step={0.01} onChange={(v) => update({ barOpacity: v })} />
      </Section>

      <Section title="Animation">
        <Slider label="Speed / flow" value={s.speed} min={0.1} max={5} step={0.05} onChange={(v) => update({ speed: v })} />
        <Slider label="Glass warp" value={s.colorIntensity} min={0} max={1.5} step={0.01} onChange={(v) => update({ colorIntensity: v })} />
        <Slider label="Transparency map scale" value={s.alphaScale} min={0.5} max={12} step={0.1} onChange={(v) => update({ alphaScale: v })} />
        <Slider label="Loop length" value={s.loopDuration} min={1} max={20} step={0.5} unit="s" onChange={(v) => update({ loopDuration: v })} />
      </Section>

      <Section title="Noise (grain)">
        <Slider label="Density" value={s.grainScale} min={0.05} max={3} step={0.01} onChange={(v) => update({ grainScale: v })} />
        <Slider label="Opacity" value={s.grainOpacity} min={0} max={0.6} step={0.01} onChange={(v) => update({ grainOpacity: v })} />
      </Section>

      <Section title="Text">
        <TextArea label="Content" value={s.text} onChange={(v) => update({ text: v })} />
        <Select label="Font" value={s.fontFamily} options={fontOptions} onChange={(v) => update({ fontFamily: v })} />
        <FontUpload onLoaded={(family, label) => { onFontLoaded(family, label); update({ fontFamily: family }); }} />
        <Slider label="Size" value={s.fontSize} min={12} max={480} unit="px" onChange={(v) => update({ fontSize: v })} />
        <ColorInput label="Color" value={s.textColor} onChange={(v) => update({ textColor: v })} />
        <Slider label="Line spacing" value={s.lineHeight} min={0.6} max={3} step={0.01} unit="×" onChange={(v) => update({ lineHeight: v })} />
        <Slider label="Letter spacing" value={s.letterSpacing} min={-20} max={60} unit="px" onChange={(v) => update({ letterSpacing: v })} />
        <Segmented<Alignment>
          label="Alignment"
          value={s.align}
          options={[{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }]}
          onChange={(v) => update({ align: v })}
        />
      </Section>

      <Section title="Line mask (bubble)">
        <p className="text-[11px] text-[var(--label)] -mt-1 mb-3">A central bubble fades the gradient-lines layer, revealing the text beneath.</p>
        <Slider label="Bubble size" value={s.bubbleSize} min={0.05} max={1.2} step={0.01} onChange={(v) => update({ bubbleSize: v })} />
        <Slider label="Shape (circle → squircle)" value={s.bubbleShape} min={0} max={1} step={0.01} onChange={(v) => update({ bubbleShape: v })} />
        <Slider label="Curvature (round → wide)" value={s.bubbleCurvature} min={0} max={1} step={0.01} onChange={(v) => update({ bubbleCurvature: v })} />
        <Slider label="Transparency intensity" value={s.bubbleSoftness} min={0} max={1} step={0.01} onChange={(v) => update({ bubbleSoftness: v })} />
      </Section>

      <Section title="Background">
        <Toggle label="Gradient fill" value={s.bgGradient} onChange={(v) => update({ bgGradient: v })} />
        <ColorInput label={s.bgGradient ? "Color A" : "Color"} value={s.bgColor} onChange={(v) => update({ bgColor: v })} />
        {s.bgGradient && <ColorInput label="Color B" value={s.bgColor2} onChange={(v) => update({ bgColor2: v })} />}
        {s.bgGradient && <Slider label="Gradient angle" value={s.bgGradAngle} min={0} max={360} unit="°" onChange={(v) => update({ bgGradAngle: v })} />}
      </Section>

      <Section title="Export">
        <Select
          label="Resolution"
          value={s.exportRes}
          options={[
            { label: `Match canvas (${s.width}×${s.height})`, value: "canvas" },
            { label: "1080p (long edge 1920)", value: "1080p" },
            { label: "2K (long edge 2560)", value: "2k" },
          ]}
          onChange={(v) => update({ exportRes: v })}
        />
        <Slider label="FPS" value={s.fps} min={12} max={60} onChange={(v) => update({ fps: v })} />
        {exporting && (
          <div className="mb-3">
            <div className="h-1.5 rounded-full bg-[var(--field-bg)] overflow-hidden">
              <div className="h-full bg-[var(--ctrl-active)] transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="text-[11px] text-[var(--label)] mt-1">Exporting… {Math.round(progress * 100)}%</p>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <button disabled={exporting} onClick={onExportPng} className="rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--ctrl-active)] disabled:opacity-40">PNG</button>
          <button disabled={exporting} onClick={() => onExportVideo("webm")} className="rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] py-2 text-xs font-medium text-[var(--text)] hover:border-[var(--ctrl-active)] disabled:opacity-40">WEBM</button>
          <button disabled={exporting || !canMp4} title={canMp4 ? "" : "Requires Chrome/Edge (WebCodecs)"} onClick={() => onExportVideo("mp4")} className="rounded-md bg-[var(--ctrl-active)] py-2 text-xs font-medium text-white hover:brightness-110 disabled:opacity-40">MP4</button>
        </div>
        {!canMp4 && <p className="text-[11px] text-amber-500/80 mt-2">MP4 needs WebCodecs (Chrome/Edge). WEBM &amp; PNG work here.</p>}
      </Section>
    </div>
  );
}
