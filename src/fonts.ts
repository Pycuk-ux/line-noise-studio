// Curated Google Fonts, loaded on demand via the CSS2 API. Custom uploads still
// work alongside these (see FontUpload).
export interface GoogleFont {
  label: string;
  family: string; // Google family name
  css: string; // the font-family value used on the canvas
}

const S = "sans-serif";
const R = "serif";
const M = "monospace";

export const GOOGLE_FONTS: GoogleFont[] = [
  // Sans
  { label: "Roboto", family: "Roboto", css: `"Roboto", ${S}` },
  { label: "Montserrat", family: "Montserrat", css: `"Montserrat", ${S}` },
  { label: "Poppins", family: "Poppins", css: `"Poppins", ${S}` },
  { label: "Work Sans", family: "Work Sans", css: `"Work Sans", ${S}` },
  { label: "Space Grotesk", family: "Space Grotesk", css: `"Space Grotesk", ${S}` },
  { label: "Manrope", family: "Manrope", css: `"Manrope", ${S}` },
  { label: "DM Sans", family: "DM Sans", css: `"DM Sans", ${S}` },
  { label: "Archivo", family: "Archivo", css: `"Archivo", ${S}` },
  { label: "Rubik", family: "Rubik", css: `"Rubik", ${S}` },
  // Condensed / display
  { label: "Oswald", family: "Oswald", css: `"Oswald", ${S}` },
  { label: "Bebas Neue", family: "Bebas Neue", css: `"Bebas Neue", ${S}` },
  { label: "Anton", family: "Anton", css: `"Anton", ${S}` },
  { label: "Teko", family: "Teko", css: `"Teko", ${S}` },
  // Serif
  { label: "Playfair Display", family: "Playfair Display", css: `"Playfair Display", ${R}` },
  { label: "Lora", family: "Lora", css: `"Lora", ${R}` },
  { label: "Libre Baskerville", family: "Libre Baskerville", css: `"Libre Baskerville", ${R}` },
  { label: "Cormorant Garamond", family: "Cormorant Garamond", css: `"Cormorant Garamond", ${R}` },
  { label: "EB Garamond", family: "EB Garamond", css: `"EB Garamond", ${R}` },
  { label: "Merriweather", family: "Merriweather", css: `"Merriweather", ${R}` },
  { label: "Bodoni Moda", family: "Bodoni Moda", css: `"Bodoni Moda", ${R}` },
  { label: "Fraunces", family: "Fraunces", css: `"Fraunces", ${R}` },
  // Display serif
  { label: "DM Serif Display", family: "DM Serif Display", css: `"DM Serif Display", ${R}` },
  { label: "Abril Fatface", family: "Abril Fatface", css: `"Abril Fatface", ${R}` },
  // Mono
  { label: "Space Mono", family: "Space Mono", css: `"Space Mono", ${M}` },
  { label: "JetBrains Mono", family: "JetBrains Mono", css: `"JetBrains Mono", ${M}` },
];

const loaded = new Set<string>();

export function isGoogleFont(css: string): GoogleFont | undefined {
  return GOOGLE_FONTS.find((f) => f.css === css);
}

// Inject the stylesheet (once) and wait until the face is actually ready, so the
// canvas bakes with the real glyphs instead of a fallback.
export async function loadGoogleFont(f: GoogleFont): Promise<void> {
  const id = "gf-" + f.family.replace(/\s+/g, "-");
  if (!loaded.has(f.family) && !document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${f.family.replace(/\s+/g, "+")}&display=swap`;
    // Wait for the stylesheet to load & parse so the @font-face is registered
    // before we ask the FontFaceSet to load the actual glyphs.
    const parsed = new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
    });
    document.head.appendChild(link);
    await parsed;
  }
  loaded.add(f.family);
  try {
    await document.fonts.load(`64px "${f.family}"`);
    await document.fonts.ready;
  } catch {
    /* fall back silently */
  }
}
