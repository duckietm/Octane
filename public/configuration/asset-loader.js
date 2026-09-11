(() => {
  const ASSET_KEY = new TextEncoder().encode("slogga-dist-assets-2026");
  const MODE_DEFAULTS = {
    distObfuscationEnabled: false,
    secureAssetsEnabled: false,
    secureApiEnabled: false
  };

  const isDebug = () => {
    try {
      const search = new URLSearchParams(location.search);
      return search.get("loaderDebug") === "1" || localStorage.getItem("nitro.loader.debug") === "1";
    } catch {
      return false;
    }
  };

  const debug = (message) => {
    try {
      window.__octaneLoaderDebug = message;
      const log = Array.isArray(window.__octaneLoaderDebugLog) ? window.__octaneLoaderDebugLog : [];
      log.push(message);
      window.__octaneLoaderDebugLog = log.slice(-30);
      if(!isDebug()) {
        document.getElementById("octane-loader-debug")?.remove();
        return;
      }
      let node = document.getElementById("octane-loader-debug");
      if(!node) {
        node = document.createElement("div");
        node.id = "octane-loader-debug";
        node.style.cssText = "position:fixed;left:8px;top:8px;z-index:2147483647;padding:6px 8px;max-width:70vw;background:rgba(0,0,0,.85);color:#fff;font:12px monospace;white-space:pre-wrap";
        document.body.appendChild(node);
      }
      node.textContent = window.__octaneLoaderDebugLog.slice(-10).join("\n");
    } catch {}
  };

  const getBase = () => {
    if(typeof window.__octaneLoaderBase === "string" && window.__octaneLoaderBase) {
      try { return new URL(window.__octaneLoaderBase); } catch {}
    }
    const source = document.currentScript?.src || location.href;
    return new URL(".", source);
  };

  const getDeployBase = () => {
    try { return new URL("..", getBase()); }
    catch { return new URL("/", location.href); }
  };

  const withCacheBust = (url) => {
    url.searchParams.set("v", Date.now().toString(36));
    return url;
  };

  const renderShell = () => {
    const root = document.getElementById("root");
    if(!root || root.firstChild) return;
    // Match the React LoadingView background so the pre-React shell paints
    // the same gradient — no light-blue login-skeleton flash before the
    // loader takes over.
    root.innerHTML = '<div style="position:fixed;inset:0;background:radial-gradient(#1d1a24,#003a6b);overflow:hidden;z-index:1"></div>';
  };

  const decodeAsset = (bytes) => {
    const output = new Uint8Array(bytes.length);
    for(let index = 0; index < bytes.length; index++) {
      output[index] = bytes[index] ^ ASSET_KEY[index % ASSET_KEY.length] ^ ((index * 31) & 255);
    }
    return output;
  };

  const gunzip = async (bytes) => {
    if(!("DecompressionStream" in self)) throw new Error("gzip decompression unsupported");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  };

  const resolveAssetCandidates = (path) => {
    const base = getBase();
    const deploy = getDeployBase();
    const normalized = path.replace(/^\.\//, "");
    const file = normalized.split("/").pop();
    const relative = normalized.replace(/^\//, "");
    const urls = [
      new URL("src/assets/" + file, deploy),
      new URL("assets/" + file, deploy),
      new URL(relative, deploy),
      new URL("./src/assets/" + file, base),
      new URL("./assets/" + file, base),
      new URL("/src/assets/" + file, base.origin),
      new URL("/assets/" + file, base.origin),
      new URL("/client/src/assets/" + file, base.origin),
      new URL("/client/assets/" + file, base.origin)
    ];
    return [...new Map(urls.map(url => [url.href, url])).values()];
  };

  const expandAssetCandidates = (path) => {
    const base = getBase();
    if(/^https?:\/\//i.test(path)) return [new URL(path)];
    if(path.startsWith("/")) return [new URL(path, base.origin + "/")];
    return resolveAssetCandidates(path);
  };

  const fetchBytes = async (path) => {
    let error = null;
    debug("loader: fetching " + path);
    for(const candidate of expandAssetCandidates(path)) {
      try {
        debug("loader: try " + candidate.href);
        const response = await fetch(withCacheBust(candidate), { cache: "no-store" });
        if(!response.ok) {
          error = new Error("asset " + candidate.pathname + " " + response.status);
          continue;
        }
        debug("loader: ok " + candidate.href);
        return new Uint8Array(await response.arrayBuffer());
      } catch(caught) {
        error = caught;
      }
    }
    throw error || new Error("asset " + path + " not found");
  };

  const loadDatAsset = async (path) => gunzip(decodeAsset(await fetchBytes(path)));

  const injectCssText = (bytes) => {
    const node = document.createElement("style");
    node.textContent = new TextDecoder().decode(bytes);
    document.head.appendChild(node);
    debug("loader: css injected from dat");
  };

  const matchesContentType = (contentType, accepted) => {
    if(!contentType) return true;
    return accepted.some(token => contentType.indexOf(token) !== -1);
  };

  const probePlainAsset = async (path, accepted) => {
    let lastError = null;
    for(const candidate of expandAssetCandidates(path)) {
      try {
        debug("loader: probe " + candidate.href);
        const response = await fetch(withCacheBust(candidate), { cache: "no-store" });
        if(!response.ok) {
          lastError = new Error("asset " + candidate.pathname + " " + response.status);
          continue;
        }
        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        if(!matchesContentType(contentType, accepted)) {
          lastError = new Error("asset " + candidate.pathname + " wrong type " + contentType);
          continue;
        }
        debug("loader: probe ok " + candidate.href);
        const url = new URL(candidate.href);
        url.searchParams.set("v", Date.now().toString(36));
        return url;
      } catch(caught) {
        lastError = caught;
      }
    }
    throw lastError || new Error("asset " + path + " not found");
  };

  const loadPlainCss = async (path) => {
    const href = await probePlainAsset(path, ["text/css"]);
    await new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href.href;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("plain css failed"));
      document.head.appendChild(link);
    });
    debug("loader: css linked");
  };

  const importBytes = async (bytes) => {
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "text/javascript" }));
    try {
      debug("loader: importing app blob");
      await import(blobUrl);
      debug("loader: app blob imported");
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  const importPlainJs = async (path) => {
    const href = await probePlainAsset(path, ["javascript", "ecmascript"]);
    debug("loader: importing plain js " + href.href);
    await import(href.href);
    debug("loader: plain js imported");
  };

  const readClientMode = async () => {
    try {
      if(window.__octaneClientMode && typeof window.__octaneClientMode === "object") {
        debug("loader: client-mode preset");
        return window.__octaneClientMode;
      }
      const url = withCacheBust(new URL("./client-mode.json", getBase()));
      const response = await fetch(url, { cache: "no-store" });
      if(!response.ok) throw new Error("client-mode " + response.status);
      const payload = await response.json();
      const mode = { ...MODE_DEFAULTS, ...(payload && typeof payload === "object" ? payload : {}) };
      window.__octaneClientMode = mode;
      debug("loader: client-mode loaded");
      return mode;
    } catch(error) {
      window.__octaneClientMode = { ...MODE_DEFAULTS };
      debug("loader: client-mode fallback " + (error?.message || error));
      return window.__octaneClientMode;
    }
  };

  const assetLikelyExists = async (path) => {
    for(const candidate of expandAssetCandidates(path)) {
      try {
        const response = await fetch(withCacheBust(new URL(candidate.href)), { method: "HEAD", cache: "no-store" });
        if(response.ok) return true;
        if(response.status === 404 || response.status === 410) continue;
        return true;
      } catch {
        return true;
      }
    }
    return false;
  };

  const fetchManifestEntry = async (mode) => {
    const base = getBase();
    const deploy = getDeployBase();
    const candidates = [
      new URL(".vite/manifest.json", deploy),
      new URL("manifest.json", deploy),
      new URL(".vite/manifest.json", base.origin + "/"),
      new URL("manifest.json", base.origin + "/"),
      new URL(".vite/manifest.json", base),
      new URL("manifest.json", base)
    ];
    const seen = new Set();
    for(const candidate of candidates) {
      if(seen.has(candidate.href)) continue;
      seen.add(candidate.href);
      try {
        const response = await fetch(withCacheBust(new URL(candidate.href)), { cache: "no-store" });
        if(!response.ok) continue;
        const json = await response.json();
        if(!json || typeof json !== "object") continue;
        const entry = findEntryFromManifest(json);
        if(!entry) continue;
        let manifestBase = new URL(".", candidate.href);
        if(/\/\.vite\/manifest\.json$/.test(candidate.pathname)) {
          manifestBase = new URL("..", manifestBase);
        }
        const jsPath = resolveManifestPath(manifestBase, entry.js);
        // A manifest left over from a previous deploy names hashed files that
        // no longer exist — verify before committing, so a stale copy falls
        // through to the next manifest source instead of a hard 404.
        const verifyTarget = mode.distObfuscationEnabled ? jsPath + ".dat" : jsPath;
        if(!(await assetLikelyExists(verifyTarget))) {
          debug("loader: stale manifest " + candidate.href + " (missing " + verifyTarget + ")");
          continue;
        }
        debug("loader: entry from manifest " + candidate.href + " " + jsPath);
        return {
          js: jsPath,
          css: entry.css.map(file => resolveManifestPath(manifestBase, file))
        };
      } catch {}
    }
    return null;
  };

  const findEntryFromManifest = (manifest) => {
    let bootstrap = null;
    for(const key of Object.keys(manifest)) {
      const entry = manifest[key];
      if(!entry || typeof entry !== "object" || !entry.isEntry) continue;
      if(/bootstrap\./.test(key) || /bootstrap\./.test(entry.file || "")) {
        bootstrap = entry;
        break;
      }
      if(!bootstrap) bootstrap = entry;
    }
    if(!bootstrap) return null;
    const css = Array.isArray(bootstrap.css) ? bootstrap.css.slice() : [];
    return { js: bootstrap.file, css };
  };

  const resolveManifestPath = (manifestBase, file) => {
    if(/^https?:\/\//i.test(file)) return file;
    if(file.startsWith("/")) return file;
    return new URL(file, manifestBase).pathname;
  };

  const isLoaderUrl = (href) => /(?:^|\/)bootstrap\.js(?:$|\?|#)/i.test(href) || /(?:^|\/)asset-loader\.js(?:$|\?|#)/i.test(href);

  const fetchEntryFromIndexHtml = async () => {
    const base = getBase();
    const deploy = getDeployBase();
    const candidates = [
      new URL("index.html", deploy),
      new URL("./", deploy),
      new URL("/index.html", base.origin + "/"),
      new URL("/", base.origin + "/")
    ];
    const seen = new Set();
    for(const candidate of candidates) {
      if(seen.has(candidate.href)) continue;
      seen.add(candidate.href);
      try {
        const response = await fetch(withCacheBust(new URL(candidate.href)), { cache: "no-store" });
        if(!response.ok) continue;
        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        if(contentType && contentType.indexOf("html") === -1) continue;
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        if(!doc) continue;
        const resolveAttr = (raw) => {
          if(!raw) return "";
          if(/^https?:\/\//i.test(raw)) return raw;
          try { return new URL(raw, candidate.href).pathname; }
          catch { return raw; }
        };
        const scriptNode = Array.from(doc.querySelectorAll('script[type="module"][src]'))
          .map(node => node.getAttribute("src") || "")
          .find(src => src && !isLoaderUrl(src));
        if(!scriptNode) continue;
        const cssNodes = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href]'))
          .map(node => node.getAttribute("href") || "")
          .filter(href => href && !isLoaderUrl(href));
        const jsAbs = resolveAttr(scriptNode);
        const cssAbs = cssNodes.map(resolveAttr);
        debug("loader: entry from index.html " + jsAbs);
        return { js: jsAbs, css: cssAbs };
      } catch {}
    }
    return null;
  };

  (async () => {
    debug("loader: start");
    renderShell();
    const mode = await readClientMode();

    let jsPath = null;
    let cssPaths = [];
    const manifestEntry = await fetchManifestEntry(mode);
    if(manifestEntry) {
      jsPath = manifestEntry.js;
      if(manifestEntry.css.length) cssPaths = manifestEntry.css;
    }
    if(!jsPath) {
      const indexEntry = await fetchEntryFromIndexHtml();
      if(indexEntry) {
        jsPath = indexEntry.js;
        if(indexEntry.css.length) cssPaths = indexEntry.css;
      }
    }
    if(!jsPath) {
      jsPath = "./assets/app.js";
      cssPaths = ["./assets/app.css"];
      debug("loader: entry fallback to app.js/app.css");
    }

    if(mode.distObfuscationEnabled) {
      const [cssBytesList, jsBytes] = await Promise.all([
        Promise.all(cssPaths.map(path => loadDatAsset(path + ".dat"))),
        loadDatAsset(jsPath + ".dat")
      ]);
      cssBytesList.forEach(bytes => injectCssText(bytes));
      await importBytes(jsBytes);
      return;
    }
    for(const css of cssPaths) await loadPlainCss(css);
    await importPlainJs(jsPath);
  })().catch(error => {
    console.error(error);
    debug("loader: failed " + (error?.message || error));
    document.body.textContent = "Unable to load client.";
  });
})();
