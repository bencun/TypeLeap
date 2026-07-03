import { escapeHtml, vintagePage } from "../shared/html.js";

export function searchForm(query: string): string {
  return `<form action="/" method="get">
<a href="/"><font size=6 color="#008000">Frog</font><font size=6 color="#000000">Find!</font></a> Leap again: <input type="text" size="30" name="q" value="${escapeHtml(query)}">
<input type="submit" value="Ribbbit!">
</form>`;
}

export function homepage(): string {
  return vintagePage(
    "FrogFind!",
    `<br><br><center><h1><font size=7><font color="#008000">Frog</font>Find!</font></h1></center>
<center><h3>The Search Engine for Vintage Computers</h3></center>
<br><br>
<center>
<form action="/" method="get">
Leap to: <input type="text" size="30" name="q"><br>
<input type="submit" value="Ribbbit!">
</form>
</center>
<br><br><br>
<small><center>Built by <b><a href="https://youtube.com/ActionRetro">Action Retro</a></b> on YouTube | <a href="/about">Why build such a thing?</a></center><br>
<small><center>Powered by DuckDuckGo</center></small>`
  );
}

export function aboutPage(): string {
  return vintagePage(
    "FrogFind!",
    `${searchForm("")}
<hr>
<br>
<center>
<h1>What in the world is FrogFind?</h1>
<small>A quick FAQ on an unconventional search engine</small>
</center>
<br>
<h3>Who made FrogFind?</h3>
Hi, I'm Sean, A.K.A. <a href="https://youtube.com/ActionRetro">Action Retro</a> on YouTube. I work on a lot of 80's and 90's Macs (and other vintage machines), and I really like to try and get them online. However, the modern internet is not kind to old machines, which generally cannot handle the complicated javascript, CSS, and encryption that modern sites have. However, they can browse basic websites just fine. So I decided to see how much of the internet I could turn into basic websites, so that old machines can browse the modern internet once again!
<h3>How does FrogFind work?</h3>
The search functionality of FrogFind is basically a custom wrapper for DuckDuckGo search, converting the results to extremely basic HTML that old browsers can read. When clicking through to pages from search results, those pages are processed through Mozilla's Readability, which is what powers Firefox's reader mode. I then further strip down the results to be as basic HTML as possible.
<h3>What machines do you test FrogFind on?</h3>
I designed FrogFind with classic Macs in mind, so I've been testing on my SE/30 to make sure it looks good in 1 bit color with a 512x384 resolution. Most of my testing has been on Netscape 1.1N and 2.0.2, as well as a few 68k Mac versions of iCab. FrogFind should also work great on any text-based web browser!
<h3>How can I get in touch with you?</h3>
Send me an email! <a href="mailto:actionretro@pm.me">actionretro@pm.me</a>`
  );
}

