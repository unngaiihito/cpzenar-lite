// loader.js - ローダーの最小ブートロジック（同一オリジン /app/.vite/manifest.json を読む）
(async () => {
  try {
    const res = await fetch('/app/.vite/manifest.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('manifest fetch failed');
    const mani = await res.json();

    // Vite の vanilla テンプレは "assets/index-*.js" がエントリ（'index.html' キーでも可）
    // キーが安定しない環境向けに、最初のエントリっぽいものを拾うフォールバックも用意
    let entry = mani['index.html']?.file
             || Object.values(mani).find(v => v?.isEntry)?.file;

    const cssList =
      mani['index.html']?.css
      || Object.values(mani).find(v => v?.isEntry)?.css
      || [];

    if (!entry) throw new Error('entry not found in manifest');

    // CSS を注入
    for (const css of cssList) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `/app/${css}`;
      document.head.appendChild(link);
    }

    // JS を注入（defer）
    const script = document.createElement('script');
    script.src = `/app/${entry}`;
    script.defer = true;
    document.body.appendChild(script);
  } catch (e) {
    console.error('[loader] boot failed:', e);
    const el = document.getElementById('boot-error');
    if (el) el.textContent = '起動に失敗しました。時間をおいて再読込してください。';
  }
})();
