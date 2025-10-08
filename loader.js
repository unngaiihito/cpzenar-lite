(async () => {
  const root = "/app";
  const manifest = await fetch(`${root}/.vite/manifest.json`, { cache: "no-store" })
    .then(r => { if (!r.ok) throw new Error(`manifest fetch failed: ${r.status}`); return r.json(); });

  const entry = manifest["index.html"] ?? Object.values(manifest).find(m => m.isEntry);
  if (!entry) throw new Error("entry not found in manifest");

  const cssList = (entry.css ?? []).map(p => `${root}/${p}`);
  const jsFile  = entry.file ? `${root}/${entry.file}` : null;

  for (const href of cssList) {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.appendChild(l);
  }
  if (jsFile) {
    await new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = jsFile; s.defer = true;
      s.onload = res; s.onerror = () => rej(new Error(`failed to load ${jsFile}`));
      document.head.appendChild(s);
    });
  }
})().catch(err => {
  console.error(err);
  document.body.innerHTML =
    "<div style='padding:16px;font-family:system-ui;'><h2>Loader Error</h2><pre style='white-space:pre-wrap;'>"
    + String(err?.stack ?? err) + "</pre></div>";
});
