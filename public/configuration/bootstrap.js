(() => {
  const FALLBACK_API_BASE = "";

  const getBase = () => {
    const source = document.currentScript?.src || location.href;
    return new URL(".", source);
  };

  const LOADER_BASE = getBase();
  window.__octaneLoaderBase = LOADER_BASE.href;

  const withCacheBust = (url) => {
    url.searchParams.set("v", Date.now().toString(36));
    return url;
  };

  const bytesToBase64 = (buffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for(let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const hexValue = (code) => {
    if(code >= 48 && code <= 57) return code - 48;
    if(code >= 65 && code <= 70) return code - 55;
    if(code >= 97 && code <= 102) return code - 87;
    return -1;
  };

  const hexToBytes = (hex) => {
    const normalized = hex.trim();
    if((normalized.length % 2) !== 0) throw new Error("Invalid encrypted hex payload.");
    const bytes = new Uint8Array(normalized.length / 2);
    for(let i = 0; i < bytes.length; i++) {
      const high = hexValue(normalized.charCodeAt(i * 2));
      const low = hexValue(normalized.charCodeAt((i * 2) + 1));
      if(high < 0 || low < 0) throw new Error("Invalid encrypted hex payload.");
      bytes[i] = (high << 4) | low;
    }
    return bytes;
  };

  const deriveAesKey = async (privateKey, serverKeyBase64) => {
    const serverBytes = Uint8Array.from(atob(serverKeyBase64), char => char.charCodeAt(0));
    const serverKey = await crypto.subtle.importKey("spki", serverBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
    const secret = await crypto.subtle.deriveBits({ name: "ECDH", public: serverKey }, privateKey, 256);
    const salt = new TextEncoder().encode("nitro-secure-assets-v1");
    const material = new Uint8Array(secret.byteLength + salt.length);
    material.set(new Uint8Array(secret), 0);
    material.set(salt, secret.byteLength);
    const hash = await crypto.subtle.digest("SHA-256", material);
    return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["decrypt"]);
  };

  const decryptPayload = async (key, response) => {
    if(response.headers.get("X-Nitro-Sec") !== "1") return response.text();
    const bytes = hexToBytes(await response.text());
    if(bytes.length < 13) throw new Error("Encrypted response is too short.");
    const iv = bytes.slice(0, 12);
    const payload = bytes.slice(12);
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, payload);
    return new TextDecoder().decode(clear);
  };

  const importTextModule = async (sourceText) => {
    const blobUrl = URL.createObjectURL(new Blob([sourceText], { type: "text/javascript" }));
    try {
      await import(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  const fetchPlainClientMode = async () => {
    try {
      const url = withCacheBust(new URL("./client-mode.json", LOADER_BASE));
      const response = await fetch(url, { cache: "no-store" });
      if(!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      if(payload && typeof payload === "object") {
        window.__octaneClientMode = payload;
        return payload;
      }
    } catch(error) {
      console.warn("[Octane] client-mode fetch failed:", error?.message || error);
    }
    return null;
  };

  const loadPlainBootstrap = async () => {
    const url = withCacheBust(new URL("./asset-loader.js", LOADER_BASE));
    await import(url.href);
  };

  const loadSecureBootstrap = async (apiBase) => {
    if(!apiBase) throw new Error("Missing apiBaseUrl for secure bootstrap.");

    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    const publicKeyBuffer = await crypto.subtle.exportKey("spki", pair.publicKey);
    const publicKey = bytesToBase64(publicKeyBuffer);
    const base = apiBase.replace(/\/$/, "");
    const bootstrapResponse = await fetch(base + "/nitro-sec/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: publicKey })
    });

    if(!bootstrapResponse.ok) throw new Error("Secure bootstrap failed: HTTP " + bootstrapResponse.status);

    const bootstrapPayload = await bootstrapResponse.json();
    if(!bootstrapPayload || typeof bootstrapPayload.key !== "string" || !bootstrapPayload.key.length) {
      throw new Error("Secure bootstrap returned an invalid server key.");
    }

    const sessionKey = await deriveAesKey(pair.privateKey, bootstrapPayload.key);

    const fetchSecureConfig = async (file) => {
      const url = new URL(base + "/nitro-sec/file");
      url.searchParams.set("kind", "config");
      url.searchParams.set("file", file);
      url.searchParams.set("v", Date.now().toString(36));

      const response = await fetch(url.toString(), {
        headers: { "X-Nitro-Key": publicKey },
        cache: "no-store"
      });

      if(!response.ok) throw new Error("Failed to load secure config " + file + ": HTTP " + response.status);

      return decryptPayload(sessionKey, response);
    };

    const modeText = await fetchSecureConfig("client-mode.json");
    window.__octaneClientMode = JSON.parse(modeText);

    const loaderText = await fetchSecureConfig("asset-loader.js");
    await importTextModule(loaderText);
  };

  (async () => {
    const mode = await fetchPlainClientMode();
    const wantsSecure = !!(mode && mode.secureAssetsEnabled);
    const apiBase = (mode && typeof mode.apiBaseUrl === "string" && mode.apiBaseUrl) || FALLBACK_API_BASE;

    if(wantsSecure) {
      try {
        await loadSecureBootstrap(apiBase);
        return;
      } catch(error) {
        console.warn("[Octane] Secure bootstrap fallback:", error?.message || error);
      }
    }

    await loadPlainBootstrap();
  })().catch(error => {
    console.error(error);
    document.body.textContent = "Unable to load client.";
  });
})();
