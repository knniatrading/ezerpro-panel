import type { CSSProperties } from "react";

const HEX = /^#[0-9a-f]{6}$/i;

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Contraste del color contra el blanco (texto de los botones). WCAG pide 3 o más para texto en negrita. */
export function contrastWithWhite(hex: string): number {
  const [r, g, b] = rgb(hex);
  const lum = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return 1.05 / (lum + 0.05);
}

export function isValidBrandColor(hex: string | null | undefined): hex is string {
  return !!hex && HEX.test(hex);
}

export const MIN_CONTRAST = 4.5;

function darken(hex: string, amount: number): string {
  return (
    "#" +
    rgb(hex)
      .map((v) => Math.round(v * (1 - amount)).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Variables CSS que repintan botones y acentos con el color del negocio. */
export function brandStyle(color: string | null | undefined): CSSProperties | undefined {
  if (!isValidBrandColor(color) || contrastWithWhite(color) < MIN_CONTRAST) return undefined;
  return { ["--green" as string]: color, ["--green-dark" as string]: darken(color, 0.2) } as CSSProperties;
}

/** Reduce una imagen a 256 px y la devuelve como data URL liviana (máx. ~90.000 caracteres). */
export async function shrinkLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    throw new Error("Usa una imagen PNG, JPG o WEBP.");
  }
  const bmp = await createImageBitmap(file);
  const tries: [number, string, number][] = [
    [256, "image/png", 1],
    [192, "image/png", 1],
    [256, "image/webp", 0.85],
    [192, "image/webp", 0.7],
    [128, "image/webp", 0.7],
  ];
  for (const [max, type, q] of tries) {
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL(type, q);
    if (url.startsWith(`data:${type}`) && url.length <= 90000) return url;
  }
  throw new Error("La imagen es muy pesada. Prueba con una más simple.");
}
