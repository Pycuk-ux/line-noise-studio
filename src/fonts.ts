// Curated Google Fonts (40: 10 sans, 10 serif, 10 handwriting, 10 mono), loaded
// on demand via the CSS2 API. Custom uploads still work alongside these.
// Each font lists the weights it actually ships — requesting a missing weight
// makes the whole stylesheet fail, so these are high-confidence subsets.
export type FontCategory = "sans" | "serif" | "handwriting" | "mono";

export interface GoogleFont {
  label: string;
  family: string; // Google family name
  css: string; // font-family value used on the canvas
  category: FontCategory;
  weights: number[];
}

const FALLBACK: Record<FontCategory, string> = {
  sans: "sans-serif",
  serif: "serif",
  handwriting: "cursive",
  mono: "monospace",
};

export const CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: "Sans-serif",
  serif: "Serif",
  handwriting: "Handwriting",
  mono: "Monospace",
};

function g(label: string, family: string, category: FontCategory, weights: number[]): GoogleFont {
  return { label, family, category, weights, css: `"${family}", ${FALLBACK[category]}` };
}

export const GOOGLE_FONTS: GoogleFont[] = [
  // Sans-serif (10)
  g("Roboto", "Roboto", "sans", [300, 400, 500, 700, 900]),
  g("Open Sans", "Open Sans", "sans", [300, 400, 500, 600, 700, 800]),
  g("Montserrat", "Montserrat", "sans", [300, 400, 500, 600, 700, 800, 900]),
  g("Poppins", "Poppins", "sans", [300, 400, 500, 600, 700]),
  g("Inter", "Inter", "sans", [300, 400, 500, 600, 700, 800]),
  g("Lato", "Lato", "sans", [300, 400, 700, 900]),
  g("Work Sans", "Work Sans", "sans", [300, 400, 500, 600, 700]),
  g("Raleway", "Raleway", "sans", [300, 400, 500, 600, 700, 800]),
  g("Nunito", "Nunito", "sans", [300, 400, 600, 700, 800]),
  g("Oswald", "Oswald", "sans", [300, 400, 500, 600, 700]),

  // Serif (10)
  g("Playfair Display", "Playfair Display", "serif", [400, 500, 600, 700, 800, 900]),
  g("Merriweather", "Merriweather", "serif", [300, 400, 700, 900]),
  g("Lora", "Lora", "serif", [400, 500, 600, 700]),
  g("PT Serif", "PT Serif", "serif", [400, 700]),
  g("Libre Baskerville", "Libre Baskerville", "serif", [400, 700]),
  g("Cormorant Garamond", "Cormorant Garamond", "serif", [300, 400, 500, 600, 700]),
  g("EB Garamond", "EB Garamond", "serif", [400, 500, 600, 700, 800]),
  g("Bitter", "Bitter", "serif", [300, 400, 500, 700]),
  g("Source Serif 4", "Source Serif 4", "serif", [400, 600, 700]),
  g("DM Serif Display", "DM Serif Display", "serif", [400]),

  // Handwriting (10)
  g("Dancing Script", "Dancing Script", "handwriting", [400, 500, 600, 700]),
  g("Pacifico", "Pacifico", "handwriting", [400]),
  g("Caveat", "Caveat", "handwriting", [400, 500, 600, 700]),
  g("Great Vibes", "Great Vibes", "handwriting", [400]),
  g("Satisfy", "Satisfy", "handwriting", [400]),
  g("Sacramento", "Sacramento", "handwriting", [400]),
  g("Shadows Into Light", "Shadows Into Light", "handwriting", [400]),
  g("Permanent Marker", "Permanent Marker", "handwriting", [400]),
  g("Kalam", "Kalam", "handwriting", [300, 400, 700]),
  g("Lobster", "Lobster", "handwriting", [400]),

  // Monospace (10)
  g("JetBrains Mono", "JetBrains Mono", "mono", [400, 500, 700]),
  g("Roboto Mono", "Roboto Mono", "mono", [300, 400, 500, 700]),
  g("Source Code Pro", "Source Code Pro", "mono", [400, 500, 700]),
  g("Space Mono", "Space Mono", "mono", [400, 700]),
  g("IBM Plex Mono", "IBM Plex Mono", "mono", [400, 500, 700]),
  g("Fira Code", "Fira Code", "mono", [400, 500, 700]),
  g("Inconsolata", "Inconsolata", "mono", [400, 500, 700]),
  g("Ubuntu Mono", "Ubuntu Mono", "mono", [400, 700]),
  g("Courier Prime", "Courier Prime", "mono", [400, 700]),
  g("DM Mono", "DM Mono", "mono", [400, 500]),
];

export const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular",
  500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold", 900: "Black",
};

// Weights offered for non-Google fonts (system stacks / uploads). System fonts
// reliably have these; single-weight uploads faux-bold for 700.
const DEFAULT_WEIGHTS = [400, 700];

const loaded = new Set<string>();

export function isGoogleFont(css: string): GoogleFont | undefined {
  return GOOGLE_FONTS.find((f) => f.css === css);
}

export function weightsFor(css: string): number[] {
  return isGoogleFont(css)?.weights ?? DEFAULT_WEIGHTS;
}

// Snap a desired weight to the closest one the font actually offers.
export function snapWeight(css: string, weight: number): number {
  const ws = weightsFor(css);
  if (ws.includes(weight)) return weight;
  return ws.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), ws[0]);
}

// Inject the stylesheet (once, with all the font's weights) and wait until the
// faces are ready, so the canvas bakes with the real glyphs not a fallback.
export async function loadGoogleFont(f: GoogleFont): Promise<void> {
  const id = "gf-" + f.family.replace(/\s+/g, "-");
  if (!loaded.has(f.family) && !document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    const wght = f.weights.length > 1 ? `:wght@${f.weights.join(";")}` : "";
    link.href = `https://fonts.googleapis.com/css2?family=${f.family.replace(/\s+/g, "+")}${wght}&display=swap`;
    const parsed = new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
    });
    document.head.appendChild(link);
    await parsed;
  }
  loaded.add(f.family);
  try {
    await Promise.all(f.weights.map((w) => document.fonts.load(`${w} 64px "${f.family}"`)));
    await document.fonts.ready;
  } catch {
    /* fall back silently */
  }
}
