import { describe, expect, it } from "vitest";
import { isModernBrowserOnModernOs } from "./user-agent.js";

describe("isModernBrowserOnModernOs", () => {
  it("blocks modern browsers on modern operating systems", () => {
    const modernUserAgents = [
      [
        "Chrome on Windows 10",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36"
      ],
      [
        "Edge on Windows 11",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0"
      ],
      [
        "Firefox on Windows 10",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0"
      ],
      [
        "Safari on modern macOS",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15"
      ],
      [
        "Firefox on Linux desktop",
        "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0"
      ],
      [
        "Chrome on Android",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36"
      ],
      [
        "Safari on iOS",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
      ],
      [
        "Opera on Windows 10",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 OPR/105.0.0.0"
      ]
    ] as const;

    for (const [name, userAgent] of modernUserAgents) {
      expect(isModernBrowserOnModernOs(userAgent), name).toBe(true);
    }
  });

  it("allows classic Internet Explorer versions", () => {
    const internetExplorerUserAgents = [
      ["Internet Explorer 3 on Windows 95", "Mozilla/2.0 (compatible; MSIE 3.02; Windows 95)"],
      ["Internet Explorer 3 on Windows NT 4", "Mozilla/2.0 (compatible; MSIE 3.0; Windows NT)"],
      ["Internet Explorer 4 on Windows 95", "Mozilla/4.0 (compatible; MSIE 4.01; Windows 95)"],
      ["Internet Explorer 4 on Mac PowerPC", "Mozilla/4.0 (compatible; MSIE 4.5; Mac_PowerPC)"],
      ["Internet Explorer 5 on Windows 98", "Mozilla/4.0 (compatible; MSIE 5.0; Windows 98; DigExt)"],
      ["Internet Explorer 5.5 on Windows ME", "Mozilla/4.0 (compatible; MSIE 5.5; Windows 98; Win 9x 4.90)"],
      ["Internet Explorer 5 on classic Mac OS", "Mozilla/4.0 (compatible; MSIE 5.15; Mac_PowerPC)"],
      ["Internet Explorer 6 on Windows XP", "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)"],
      ["Internet Explorer 7 on Windows XP", "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1)"],
      [
        "Internet Explorer 11 compatibility mode",
        "Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko"
      ]
    ] as const;

    for (const [name, userAgent] of internetExplorerUserAgents) {
      expect(isModernBrowserOnModernOs(userAgent), name).toBe(false);
    }
  });

  it("allows Netscape and old Mozilla browsers", () => {
    const netscapeAndMozillaUserAgents = [
      ["Netscape 2 on Windows 95", "Mozilla/2.02 [en] (Win95; I)"],
      ["Netscape 3 on Windows 95", "Mozilla/3.01Gold (Win95; I)"],
      ["Netscape 3 on classic Mac", "Mozilla/3.0 (Macintosh; I; PPC)"],
      ["Netscape 4 on Windows 98", "Mozilla/4.04 [en] (Win98; I ;Nav)"],
      ["Netscape 4 on classic Mac", "Mozilla/4.7 (Macintosh; I; PPC)"],
      ["Netscape 4 on Linux", "Mozilla/4.61 [en] (X11; I; Linux 2.2.5 i586)"],
      ["Netscape 6 on Windows 98", "Mozilla/5.0 (Windows; U; Win98; en-US; rv:0.6) Gecko/20001205 Netscape6/6.0"],
      ["Netscape 7 on Windows 2000", "Mozilla/5.0 (Windows; U; Windows NT 5.0; en-US; rv:1.0.2) Gecko/20030208 Netscape/7.02"],
      ["Mozilla 1.0 on Windows 98", "Mozilla/5.0 (Windows; U; Win98; en-US; rv:1.0.0) Gecko/20020530"],
      ["Mozilla 1.7 on Mac OS X 10.2", "Mozilla/5.0 (Macintosh; U; PPC Mac OS X Mach-O; en-US; rv:1.7) Gecko/20040616"]
    ] as const;

    for (const [name, userAgent] of netscapeAndMozillaUserAgents) {
      expect(isModernBrowserOnModernOs(userAgent), name).toBe(false);
    }
  });

  it("allows early Firefox and old Safari on old systems", () => {
    const earlyModernEraUserAgents = [
      ["Phoenix 0.5 on Windows 98", "Mozilla/5.0 (Windows; U; Win98; en-US; rv:1.3a) Gecko/20021207 Phoenix/0.5"],
      ["Firebird 0.7 on Windows 2000", "Mozilla/5.0 (Windows; U; Windows NT 5.0; en-US; rv:1.5) Gecko/20031007 Firebird/0.7"],
      ["Firefox 1 on Windows XP", "Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.7.5) Gecko/20041107 Firefox/1.0"],
      ["Firefox 2 on Windows XP", "Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1) Gecko/20061010 Firefox/2.0"],
      ["Firefox 3 on Mac OS X 10.4", "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10.4; en-US; rv:1.9) Gecko/2008061004 Firefox/3.0"],
      ["Firefox 4 on Windows XP", "Mozilla/5.0 (Windows NT 5.1; rv:2.0) Gecko/20100101 Firefox/4.0"],
      [
        "Safari 1 on Mac OS X 10.2",
        "Mozilla/5.0 (Macintosh; U; PPC Mac OS X; en-us) AppleWebKit/85.7 (KHTML, like Gecko) Safari/85.6"
      ],
      [
        "Safari 2 on Mac OS X 10.4",
        "Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10_4; en-us) AppleWebKit/412.7 (KHTML, like Gecko) Safari/412"
      ],
      [
        "Safari 3 on Mac OS X 10.5",
        "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_5_8; en-us) AppleWebKit/531.9 (KHTML, like Gecko) Version/3.0 Safari/531.9"
      ]
    ] as const;

    for (const [name, userAgent] of earlyModernEraUserAgents) {
      expect(isModernBrowserOnModernOs(userAgent), name).toBe(false);
    }
  });

  it("allows classic Mac OS browsers from the 1990s", () => {
    const classicMacUserAgents = [
      ["MacWeb on classic Mac OS", "MacWeb/2.0"],
      ["NCSA Mosaic on classic Mac OS", "NCSA_Mosaic/2.0 (Macintosh)"],
      ["Cyberdog on classic Mac OS", "Cyberdog/2.0 (Macintosh; 68K)"],
      ["iCab on classic Mac OS", "iCab/2.9.8 (Macintosh; U; PPC; Mac OS 9.2.2)"],
      ["Internet Explorer 4.5 on classic Mac OS", "Mozilla/4.0 (compatible; MSIE 4.5; Mac_PowerPC)"],
      ["Internet Explorer 5.1 on classic Mac OS", "Mozilla/4.0 (compatible; MSIE 5.1; Mac_PowerPC)"],
      ["Netscape 4 on classic Mac OS", "Mozilla/4.7 [en] (Macintosh; I; PPC)"]
    ] as const;

    for (const [name, userAgent] of classicMacUserAgents) {
      expect(isModernBrowserOnModernOs(userAgent), name).toBe(false);
    }
  });

  it("allows DOS and text-mode browsers", () => {
    const dosAndTextUserAgents = [
      ["Arachne on DOS", "xChaos_Arachne/5.1.89;GPL,386+"],
      ["Arachne newer DOS build", "Arachne/1.97;GPL,386+"],
      ["DOSLynx", "DOSLynx/0.21"],
      ["Lynx", "Lynx/2.8.9rel.1 libwww-FM/2.14"],
      ["Links", "Links (2.1pre15; Linux 2.4.31 i686; 80x25)"],
      ["ELinks", "ELinks/0.11.7 (textmode; Linux; 80x25-2)"],
      ["w3m", "w3m/0.5.3"],
      ["Net-Tamer", "Net-Tamer V 1.11.2 - Registered"]
    ] as const;

    for (const [name, userAgent] of dosAndTextUserAgents) {
      expect(isModernBrowserOnModernOs(userAgent), name).toBe(false);
    }
  });

  it("does not block modern browser versions on old operating systems", () => {
    const oldOperatingSystemUserAgents = [
      ["Chrome-like UA on Windows XP", "Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.112 Safari/537.36"],
      ["Firefox 52 on Windows XP", "Mozilla/5.0 (Windows NT 5.1; rv:52.0) Gecko/20100101 Firefox/52.0"],
      [
        "Safari 9 on OS X 10.11",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/601.7.7 (KHTML, like Gecko) Version/9.1.2 Safari/601.7.7"
      ],
      [
        "Chrome on 32-bit Linux",
        "Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36"
      ]
    ] as const;

    for (const [name, userAgent] of oldOperatingSystemUserAgents) {
      expect(isModernBrowserOnModernOs(userAgent), name).toBe(false);
    }
  });

  it("does not block unknown or missing user agents", () => {
    expect(isModernBrowserOnModernOs("")).toBe(false);
    expect(isModernBrowserOnModernOs("Lynx/2.8.9rel.1 libwww-FM/2.14")).toBe(false);
  });
});
