// Records the OnceOnly reference demo from the REAL running app and assembles an MP4.
//   Prereq: fresh ledger (make reset; restart make api; do NOT seed), make web running.
//   Run:    cd frontend && node qa/demo/record.mjs
//   Output: ../exports/demo_reference/ (gitignored): demo_reference.mp4, voiceover.wav, captions.srt,
//           keyframes/, timeline.json, raw.mp4 (silent)
// Narration is synthetic (macOS `say`, voice Daniel). The on-screen pointer is a recording aid drawn
// by an injected overlay; everything else is the unmodified application.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BEATS, SCENE_TITLES } from "./beats.mjs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5173";
const VOICE = process.env.VOICE ?? "Daniel";
const RATE = process.env.RATE ?? "155";
const OUT = join(import.meta.dirname, "..", "..", "..", "exports", "demo_reference");
const GAP = 1100; // ms of breathing room after each beat

rmSync(OUT, { recursive: true, force: true });
for (const d of ["", "audio", "keyframes", "raw"]) mkdirSync(join(OUT, d), { recursive: true });

// ------------------------------------------------------------------ narration
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" });
const dur = (f) => Number(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim());
for (const b of BEATS) {
  const aiff = join(OUT, "audio", `${b.id}.aiff`);
  sh("say", ["-v", VOICE, "-r", RATE, "-o", aiff, b.say]);
  sh("ffmpeg", ["-y", "-loglevel", "error", "-i", aiff, "-ar", "48000", "-ac", "1", join(OUT, "audio", `${b.id}.wav`)]);
  b.audio = dur(join(OUT, "audio", `${b.id}.wav`));
}
console.log(`narration: ${BEATS.length} beats, ${BEATS.reduce((s, b) => s + b.audio, 0).toFixed(1)} s of speech`);

// ------------------------------------------------------------------ recording
const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3 });
await ctx.addInitScript(() => {
  const install = () => {
    if (document.getElementById("__demo_cursor")) return;
    // recording setting: hide scrollbars as macOS overlay scrollbars would (headless Chrome paints a classic gutter)
    const st = document.createElement("style");
    st.textContent = "html{scrollbar-gutter:auto!important}::-webkit-scrollbar{display:none}";
    document.head.appendChild(st);
    const c = document.createElement("div");
    c.id = "__demo_cursor";
    c.setAttribute("popover", "manual");
    c.style.cssText = "position:fixed;inset:auto;left:0;top:0;margin:0;padding:0;border:0;background:transparent;width:26px;height:26px;pointer-events:none;overflow:visible;";
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2l17 10.5-7.4 1.6L9.3 22z" fill="#fff" stroke="#0d262b" stroke-width="1.6" stroke-linejoin="round"/></svg><span style="position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;border:2px solid #2b6c8a;opacity:0;transition:opacity .25s, transform .25s;transform:scale(.4)"></span>';
    document.body.appendChild(c);
    const pos = JSON.parse(sessionStorage.getItem("__cur") || "[-60,-60]");
    const place = (x, y) => { c.style.transform = `translate(${x}px, ${y}px)`; sessionStorage.setItem("__cur", JSON.stringify([x, y])); };
    place(pos[0], pos[1]);
    const raise = () => { try { c.hidePopover(); } catch {} try { c.showPopover(); } catch {} };
    raise();
    new MutationObserver(raise).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    document.addEventListener("mousemove", (e) => place(e.clientX, e.clientY), true);
    document.addEventListener("mousedown", () => { const r = c.querySelector("span"); r.style.opacity = "1"; r.style.transform = "scale(1.4)"; setTimeout(() => { r.style.opacity = "0"; r.style.transform = "scale(.4)"; }, 260); }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
});
const page = await ctx.newPage();
// Chrome DevTools screencast: JPEG frames at device resolution (1920x1080) with wall-clock timestamps.
const cdp = await ctx.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", async (f) => {
  const file = join(OUT, "raw", `${String(frames.length).padStart(6, "0")}.jpg`);
  writeFileSync(file, Buffer.from(f.data, "base64"));
  frames.push({ file, t: f.metadata.timestamp * 1000 });
  try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch {}
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
const t0 = Date.now();
const timeline = [];
let n = 0;
for (const b of BEATS) {
  const start = Date.now() - t0;
  await b.act(page);
  const actEnd = Date.now() - t0;
  const until = start + Math.max(b.audio * 1000, actEnd - start) + GAP + (b.tail ?? 0);
  const left = until - (Date.now() - t0);
  if (left > 0) await page.waitForTimeout(left);
  await page.screenshot({ path: join(OUT, "keyframes", `${String(++n).padStart(2, "0")}_scene${b.scene}_${b.id}.png`) });
  timeline.push({ id: b.id, scene: b.scene, title: SCENE_TITLES[b.scene], url: page.url().replace(BASE, ""), start_ms: start, action_ms: actEnd - start, audio_ms: Math.round(b.audio * 1000), end_ms: Date.now() - t0, say: b.say });
  console.log(`${b.id.padEnd(3)} ${(start / 1000).toFixed(1).padStart(6)}s  action ${((actEnd - start) / 1000).toFixed(1)}s  speech ${b.audio.toFixed(1)}s  ${page.url().replace(BASE, "")}`);
}
const total = Date.now() - t0;
await cdp.send("Page.stopScreencast");
await ctx.close();
await browser.close();
// frames -> constant-frame-rate video: each frame lasts until the next one (concat demuxer)
let list = "";
for (let i = 0; i < frames.length; i++) {
  const from = Math.max(0, frames[i].t - t0);
  const to = i + 1 < frames.length ? Math.max(0, frames[i + 1].t - t0) : total;
  if (to - from <= 0) continue;
  list += `file '${frames[i].file}'\nduration ${((to - from) / 1000).toFixed(4)}\n`;
}
const firstGap = frames.length ? Math.max(0, frames[0].t - t0) : 0;
writeFileSync(join(OUT, "raw", "frames.txt"), list + `file '${frames.at(-1).file}'\n`);
const raw = join(OUT, "raw.mp4");
sh("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(OUT, "raw", "frames.txt"),
  "-vf", `tpad=start_duration=${(firstGap / 1000).toFixed(3)}:start_mode=clone,fps=30,scale=1920:1080:flags=lanczos,format=yuv420p`,
  "-c:v", "libx264", "-preset", "medium", "-crf", "16", raw]);
console.log(`screencast: ${frames.length} frames`);
rmSync(join(OUT, "raw"), { recursive: true, force: true });
writeFileSync(join(OUT, "timeline.json"), JSON.stringify({ base_url: BASE, voice: VOICE, rate: RATE, total_ms: total, beats: timeline }, null, 2));

// ------------------------------------------------------------------ voice-over track
const inputs = timeline.flatMap((t) => ["-i", join(OUT, "audio", `${t.id}.wav`)]);
const delays = timeline.map((t, i) => `[${i}:a]adelay=${t.start_ms}|${t.start_ms}[a${i}]`).join(";");
const mix = timeline.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${timeline.length}:normalize=0,apad,atrim=0:${(total / 1000).toFixed(3)}[out]`;
sh("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${delays};${mix}`, "-map", "[out]", "-ar", "48000", join(OUT, "voiceover.wav")]);

// ------------------------------------------------------------------ captions
const clean = (s) => s.replace(/\[\[[^\]]*\]\]/g, "").replace(/\s+/g, " ").trim();
const ts = (ms) => { const h = Math.floor(ms / 3.6e6), m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1000) % 60, r = Math.floor(ms % 1000); return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(r).padStart(3, "0")}`; };
let srt = "", k = 0;
for (const t of timeline) {
  const sentences = clean(t.say).match(/[^.!?]+[.!?]+/g) ?? [clean(t.say)];
  const chars = sentences.reduce((s, x) => s + x.length, 0);
  let cur = t.start_ms;
  for (const s of sentences) {
    const d = (s.length / chars) * t.audio_ms;
    srt += `${++k}\n${ts(cur)} --> ${ts(cur + d)}\n${s.trim()}\n\n`;
    cur += d;
  }
}
writeFileSync(join(OUT, "captions.srt"), srt);

// ------------------------------------------------------------------ final MP4
sh("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-i", join(OUT, "voiceover.wav"),
  "-c:v", "copy",
  "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart",
  "-metadata", "title=OnceOnly - reference demo (synthetic narration)",
  "-metadata", "comment=Real OnceOnly UI recorded with Playwright against a local stack. Narration: synthetic macOS text-to-speech (Daniel). Pointer drawn by a recording overlay.",
  join(OUT, "demo_reference.mp4")]);
console.log(`\nwrote ${join(OUT, "demo_reference.mp4")}  (${(total / 1000).toFixed(1)} s recorded)`);
