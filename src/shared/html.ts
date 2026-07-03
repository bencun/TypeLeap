/**
 * Normalizes typographic characters for older browsers and readers.
 */
export function cleanText(value: string): string {
  return value
    .replaceAll("‘", "'")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("–", "-")
    .replaceAll("&#x27;", "'");
}

/**
 * Escapes a string for safe HTML insertion.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Wraps body content in the tiny HTML shell used by TypeLeap pages.
 */
export function vintagePage(title: string, body: string): string {
  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 2.0//EN">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<html>
<head>
  <title>${escapeHtml(title)}</title>
</head>
<body>
${body}
</body>
</html>`;
}
