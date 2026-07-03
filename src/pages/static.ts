import { escapeHtml, vintagePage } from "../shared/html.js";

/**
 * Renders the search form that appears at the top of TypeLeap pages.
 */
export function searchForm(query: string): string {
  return `<form action="/" method="get">
<a href="/"><font size=6 color="#008000">Type</font><font size=6 color="#000000">Leap!</font></a> Leap again: <input type="text" size="30" name="q" value="${escapeHtml(query)}">
<input type="submit" value="Ribbbit!">
</form>`;
}

/**
 * Renders the TypeLeap home page.
 */
export function homepage(): string {
  return vintagePage(
    "TypeLeap!",
    `<br><br><center><h1><font size=7><font color="#008000">Type</font>Leap!</font></h1></center>
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

/**
 * Renders the TypeLeap about page.
 */
export function aboutPage(): string {
  return vintagePage(
    "TypeLeap!",
    `${searchForm("")}
<hr>
<br>
<center>
<h1>What in the world is TypeLeap?</h1>
<small>A quick FAQ on an unconventional search engine</small>
</center>
<br>
<h3>Who is TypeLeap for?</h3>
TypeLeap is made for old computers and simple browsers that cannot handle the complicated javascript, CSS, and encryption used across much of the modern internet. Those machines can still browse basic websites just fine, so TypeLeap turns modern pages into simpler pages they can read.
<h3>How does TypeLeap work?</h3>
The search functionality of TypeLeap is basically a custom wrapper for DuckDuckGo search, converting the results to extremely basic HTML that old browsers can read. When clicking through to pages from search results, those pages are processed through Mozilla's Readability, which is what powers Firefox's reader mode. The results are then stripped down to be as basic HTML as possible.
<h3>What machines do you test TypeLeap on?</h3>
TypeLeap is designed with classic computers in mind, especially low-resolution, low-color browsers. It should also work great on any text-based web browser!
<h3>How can I get in touch with you?</h3>
Send me an email! <a href="mailto:actionretro@pm.me">actionretro@pm.me</a>`
  );
}
