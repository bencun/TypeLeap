type BrowserInfo = {
  name: "chrome" | "edge" | "firefox" | "safari" | "opera" | "ie" | "netscape" | "unknown";
  version: number;
};

/**
 * Returns true for recognizable modern browsers running on recognizable modern operating systems.
 */
export function isModernBrowserOnModernOs(userAgent: string): boolean {
  if (!userAgent) {
    return false;
  }

  return isModernOperatingSystem(userAgent) && isModernBrowser(parseBrowser(userAgent));
}

function isModernBrowser(browser: BrowserInfo): boolean {
  switch (browser.name) {
    case "chrome":
      return browser.version >= 50;
    case "edge":
      return browser.version >= 12;
    case "firefox":
      return browser.version >= 53;
    case "safari":
      return browser.version >= 10;
    case "opera":
      return browser.version >= 15;
    case "ie":
    case "netscape":
    case "unknown":
      return false;
  }
}

function parseBrowser(userAgent: string): BrowserInfo {
  const edge = userAgent.match(/\b(?:Edg|Edge)\/(\d+)/);
  if (edge?.[1]) {
    return { name: "edge", version: Number(edge[1]) };
  }

  const opera = userAgent.match(/\b(?:OPR|Opera)\/(\d+)/);
  if (opera?.[1]) {
    return { name: "opera", version: Number(opera[1]) };
  }

  const chrome = userAgent.match(/\b(?:Chrome|CriOS)\/(\d+)/);
  if (chrome?.[1]) {
    return { name: "chrome", version: Number(chrome[1]) };
  }

  const firefox = userAgent.match(/\b(?:Firefox|FxiOS)\/(\d+)/);
  if (firefox?.[1]) {
    return { name: "firefox", version: Number(firefox[1]) };
  }

  const ie = userAgent.match(/\bMSIE (\d+)|\brv:(\d+).*Trident\//);
  if (ie?.[1] || ie?.[2]) {
    return { name: "ie", version: Number(ie[1] ?? ie[2]) };
  }

  const netscape = userAgent.match(/\bNetscape\/(\d+)/);
  if (netscape?.[1]) {
    return { name: "netscape", version: Number(netscape[1]) };
  }

  const safari = userAgent.match(/\bVersion\/(\d+).*\bSafari\//);
  if (safari?.[1]) {
    return { name: "safari", version: Number(safari[1]) };
  }

  return { name: "unknown", version: 0 };
}

function isModernOperatingSystem(userAgent: string): boolean {
  return (
    /\bWindows NT (?:1[0-9]|[6-9]\.[2-9])\b/.test(userAgent) ||
    /\bMac OS X (?:10[._](?:1[5-9]|[2-9]\d)|1[1-9][._]\d+)/.test(userAgent) ||
    /\b(?:iPhone|iPad|CPU) OS (?:1[3-9]|[2-9]\d)_/.test(userAgent) ||
    /\bAndroid (?:8|9|[1-9]\d)\b/.test(userAgent) ||
    /\b(?:X11|Wayland); Linux x86_64\b/.test(userAgent)
  );
}
