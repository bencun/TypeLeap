import sharp from "sharp";
import { allowedImageExtensions } from "../config.js";
import { fetchBuffer } from "../shared/http.js";
import { escapeHtml, vintagePage } from "../shared/html.js";
import { isHttpUrl } from "../shared/url.js";

export function hasAllowedImageExtension(value: string): boolean {
  const lower = value.toLowerCase();
  return allowedImageExtensions.some((extension) => lower.includes(extension));
}

export function isSupportedImageUrl(value: string): boolean {
  return isHttpUrl(value) && hasAllowedImageExtension(value);
}

export function imageViewerPage(url: string, referer = "/"): string {
  return vintagePage(
    "TypeLeap Image Viewer",
    `<small><a href="${escapeHtml(referer)}">< Back to previous page</a></small>
<p><small><b>Viewing image:</b> ${escapeHtml(url)}</small></p>
<img src="/image-compressed?i=${encodeURIComponent(url)}">
<br><br>
<small><a href="${escapeHtml(referer)}">< Back to previous page</a></small>`
  );
}

export async function compressedImage(url: string): Promise<{ buffer: Buffer; contentType: "jpg" | "png" } | null> {
  if (!isSupportedImageUrl(url)) {
    return null;
  }

  const { data, contentType } = await fetchBuffer(url);
  const sourceImage = sharp(Buffer.from(data));
  const metadata = await sourceImage.metadata();

  if (!metadata.width || !metadata.height) {
    return null;
  }

  const landscape = metadata.width >= metadata.height;
  const resized = sourceImage.resize({
    width: landscape ? 300 : undefined,
    height: landscape ? undefined : 200,
    withoutEnlargement: true
  });

  if (contentType === "image/png" || url.toLowerCase().includes(".png")) {
    return { buffer: await resized.png({ compressionLevel: 8 }).toBuffer(), contentType: "png" };
  }

  return { buffer: await resized.jpeg({ quality: 80 }).toBuffer(), contentType: "jpg" };
}
