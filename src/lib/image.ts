/** Dirección de la foto de un producto. La versión (img) cambia si la foto cambia, así el navegador no muestra una vieja. */
export function productImageUrl(id: string, version: number | null | undefined): string | null {
  return version ? `/api/public/menu-image/${id}?v=${version}` : null;
}

const LIMIT = 80000; // el servidor acepta hasta 90.000 caracteres

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const fail = () => reject(new Error("No se pudo leer la imagen. Prueba con una foto JPG o PNG."));
    const reader = new FileReader();
    reader.onerror = fail;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = fail;
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Reduce la foto (máximo 640 px) y la comprime hasta que quede liviana. Devuelve una imagen JPG como texto. */
export async function photoToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Elige un archivo de imagen (JPG, PNG o WEBP).");
  const img = await load(file);
  let max = 640;
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Tu navegador no puede preparar la imagen.");
    ctx.fillStyle = "#ffffff"; // los PNG con transparencia quedan sobre blanco
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of [0.82, 0.7, 0.58, 0.46]) {
      const out = canvas.toDataURL("image/jpeg", q);
      if (out.length <= LIMIT) return out;
    }
    max = Math.round(max * 0.8);
  }
  throw new Error("La foto es demasiado pesada. Prueba con otra.");
}
