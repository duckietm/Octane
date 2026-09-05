# Octane V3 — Cold-load performance

Practical recipe to take a Octane V3 cold load from the typical
60-90 s (and intermittent "Session expired") baseline down to ~4 s.
The wins compound: each section below has measurable impact, in
roughly the order of cost vs benefit.

Three things matter on the client (this repo): granular code split,
a real progress bar driven by boot stages, and capturing the
remember-token from the iframe URL on first boot. The other three —
gzip on the static server, long cache on gamedata, and a server
endpoint to mint fresh SSO tickets — are documented further down
under §5 (nginx) and §6 (IIS) plus a quick note in §4 about the
CMS contract.

---

## 1. The three Octane-side changes that matter

1. **Granular code split** (`vite.config.mjs`) — a 1 MB vendor bundle
   is replaced by ~12 smaller chunks the browser fetches in parallel
   via HTTP/2 multiplexing.
2. **Loading screen with a real progress bar** + per-stage labels
   (`src/components/loading/LoadingView.tsx`, driven by
   `src/App.tsx::prepare()`) so a slow boot looks like progress, not
   a frozen GIF.
3. **Remember-token capture from URL** (`src/App.tsx::prepare()`) so
   that when the WS drops the existing `tryRememberLogin()` round
   can hit the CMS `POST /api/auth/remember` endpoint and get a
   fresh SSO ticket instead of falling through to "Session expired".

The server-side wins (gzip, cache, SSO TTL) live outside this repo —
without them this client still loads, but you stay at the 60-90 s
baseline.

---

## 2. Vite `manualChunks` — split the vendor blob

Default `yarn build` ships:

- `vendor` ~1 MB (react + tanstack-query + framer-motion + jodit +
  emoji-mart + react-icons + howler + zustand + jsonc — everything
  merged)
- `octane-renderer` ~2.5 MB (renderer source + pixi.js inlined)
- `src` ~1.7 MB (app code)

The vendor blob forces the browser to wait on the slowest dependency
before it can hydrate. Split it by domain — see
[`vite.config.mjs`](../vite.config.mjs) for the live version, the
intent is captured below:

```js
manualChunks: id => {
    const norm = id.replace(/\\/g, '/');

    // Vendors first — pixi.js / howler / emoji-mart / jodit are aliased
    // to ../octane-renderer/node_modules, so they would otherwise be
    // swallowed by the `octane-renderer` branch lower down and pulled
    // into the renderer chunk.
    if(norm.includes('pixi.js') || norm.includes('pixi-filters')) return 'vendor-pixi';
    if(norm.includes('howler'))      return 'vendor-audio';
    if(norm.includes('@emoji-mart')) return 'vendor-emoji';
    if(norm.includes('jodit') || norm.includes('@react-page')) return 'vendor-editor';

    if(id.includes('octane-renderer') || id.includes(`${ rendererRoot }`)) {
        if(id.includes('/packages/avatar/'))        return 'octane-renderer-avatar';
        if(id.includes('/packages/communication/')) return 'octane-renderer-comm';
        if(id.includes('/packages/room/'))          return 'octane-renderer-room';
        if(id.includes('/packages/assets/'))        return 'octane-renderer-assets';
        return 'octane-renderer';
    }

    if(id.includes('node_modules')) {
        if(id.includes('@octane/renderer') || id.includes('renderer3')) return 'octane-renderer';
        if(id.match(/\/react(-dom)?\/|\/scheduler\//) || id.includes('react-error-boundary')) return 'vendor-react';
        if(id.includes('framer-motion')) return 'vendor-motion';
        if(id.includes('@tanstack'))     return 'vendor-query';
        if(id.includes('zustand')) return 'vendor-state';
        if(id.includes('react-icons'))   return 'vendor-icons';
        if(id.includes('jsonc'))         return 'vendor-jsonc';
        return 'vendor';
    }
}
```

Two practical points the comments don't make obvious:

- **Vendor checks come first.** Pixi.js, howler, emoji-mart and jodit
  are pulled in via an alias to `../octane-renderer/node_modules`,
  so their `id` matches `octane-renderer`. If the renderer branch
  runs before the vendor one, those modules end up bundled into the
  renderer chunk instead of their own — defeating the whole point.

- **Pixi often stays inlined.** Rollup keeps a module in the chunk
  of its sole importer, and `pixi.js` is consumed only through the
  `@octane/renderer` umbrella. Expect `vendor-pixi` to be
  near-empty until something *outside* the renderer also imports
  pixi. This is fine — pixi gets the renderer chunk's cache lifetime
  anyway.

Verify after `yarn build`:

```
dist/assets/octane-renderer-*.js          ~2.5 MB raw, ~765 KB gzip
dist/assets/vendor-*.js                  ~12 chunks, 4-430 KB each
dist/assets/src-*.js                     ~1.7 MB raw, ~550 KB gzip
```

If you see a single `vendor-*.js` over 800 KB raw, the chunk
function isn't matching the way you expect — log `id` from inside
`manualChunks` during build to find out what's actually being
handed in.

Also add the connection hint to [`index.html`](../index.html):

```html
<link rel="preconnect" href="https://challenges.cloudflare.com" crossorigin />
```

Saves one TLS handshake on cold load — the Turnstile script tag
already loads from that domain.

---

## 3. LoadingView — real progress, real labels

[`src/components/loading/LoadingView.tsx`](../src/components/loading/LoadingView.tsx)
renders the dark-blue boot screen the user sees before `isReady`
flips. It accepts a `progress` number (0-100) and a `currentTask`
string. The progress bar is hidden when `progress` is `undefined`
(error / Suspense fallback path) and animates between updates.

The state lives in [`src/App.tsx`](../src/App.tsx):

```ts
const [ loadingProgress, setLoadingProgress ] = useState(0);
const [ loadingTask, setLoadingTask ] = useState('');

const taskLabel = useCallback((key: string, fallback: string): string => {
    // … reads from renderer-config so the strings are translatable
});

const bumpProgress = useCallback((value: number, task?: string) => {
    setLoadingProgress(prev => (value > prev ? value : prev));
    if(task !== undefined) setLoadingTask(task);
}, []);
```

`prepare()` bumps the progress through 12 stages as it goes:

| % | Stage | Default label |
|---|---|---|
| 5 | App start | `Avvio in corso...` |
| 10 | OctaneConfig validated | `Verifica sessione` |
| 20 | Renderer constructed | `Inizializzazione renderer` |
| 25 | Config init done | `Caricamento contenuti...` |
| 36, 47, 58, 70 | each warmup task resolves | per-task (`Sto caricando il guardaroba`, …) |
| 78 | `GetSessionDataManager().init()` done | `Caricamento dati utente` |
| 85 | `GetRoomSessionManager().init()` done | `Caricamento stanze` |
| 92 | `GetRoomEngine().init()` done | `Caricamento engine grafico` |
| 98 | `GetCommunication().init()` done | `Connessione al server` |
| 100 | `setIsReady(true)` about to fire | `Pronto!` |

The labels are config-driven — `taskLabel('loading.task.boot', 'Avvio in corso...')`
reads `loading.task.*` keys from the renderer-config and falls back
to the Italian baseline if unset. To localise, add the keys to
`public/configuration/renderer-config.json` (see the `.example`
file for the full list).

Logo and background are also configurable via the same mechanism —
`loading.logo.url`, `loading.background`, `loading.progress.color`.
Leaving them empty keeps the shipped dark-blue radial + Octane V3
logo top-left.

### 3.1 The pre-React shell (asset-loader.js)

There is a second, tiny loading screen that the asset loader writes
into `#root` *before* React mounts. It used to be a light-blue
login-skeleton with two grey rectangles — visible for ~200 ms before
React took over, producing a hated flash. The template lives in
[`scripts/write-asset-loader.mjs`](../scripts/write-asset-loader.mjs)
(`renderShell`) and now paints the same `radial-gradient(#1d1a24,#003a6b)`
as the React `LoadingView`, so the handoff is invisible.

Don't hand-edit `public/configuration/asset-loader.js` — the
`prebuild` hook regenerates it from the template every `yarn build`.

---

## 4. Remember-token capture — making reconnect work

Arcturus clears `auth_ticket` to `''` the moment it consumes an SSO
ticket. Without a remember-token the client retries reconnect with
the same (now empty) ticket and falls through to "Session expired"
after 2-7 attempts.

The CMS issues a UUID family token when it serves `/client`, and
passes it on the iframe URL as `&token=<uuid>&token_exp=<unix>`. Octane
captures it on first boot:

```ts
// src/App.tsx::prepare()
try {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const tokenExpParam = urlParams.get('token_exp');
    if(tokenParam && !GetRememberLogin()) {
        const parsedExpiry = Number(tokenExpParam || 0);
        const expiresAt = (Number.isFinite(parsedExpiry) && parsedExpiry > 0)
            ? parsedExpiry
            : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        SetRememberLogin({ token: tokenParam, expiresAt });
    }
} catch(e) {
    console.warn('[App] failed to persist remember token from URL', e);
}
```

The capture is guarded by `!GetRememberLogin()` — if the user has
visited before, the stored token wins and the URL one is ignored.

Once stored, the existing `tryRememberLogin()` machinery picks it up
on every reconnect: it POSTs to
`${api.url}/api/auth/remember` (configurable via the
`login.remember.endpoint` renderer-config key), receives a fresh
SSO ticket back, and rotates the connection. See the CMS doc for the
server endpoint's contract.

Verify the stored token in browser DevTools:

```
Application → Local Storage → https://<your-domain>
  Key: nitro.auth.remember
  Value: {"token":"<uuid>","expiresAt":1781912345,"username":"<u>"}
```

If `nitro.auth.remember` is missing after a successful first load,
the CMS isn't passing `token=` on the iframe URL. Check
`AuthController.client` on the CMS side.

---

## 5. Server-side: nginx gzip + long cache (the single biggest win)

The Octane client ships ~4.3 MB raw across the main bundle, renderer
chunk and vendor splits. If the server doesn't compress and doesn't
let the browser cache, every visitor pays the full price on every
load — that's exactly the 60-90 s baseline you avoid by configuring
nginx properly.

### 5.1 Enable gzip globally

Default nginx ships with the `gzip` block commented out. Edit
`/etc/nginx/nginx.conf` and replace the `#gzip  on;` line inside the
`http {}` block:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_min_length 1024;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/javascript
    application/x-javascript
    application/json
    application/jsonc
    application/xml
    application/rss+xml
    application/atom+xml
    image/svg+xml
    font/ttf
    font/otf
    application/font-woff
    application/vnd.ms-fontobject;
```

Back up the file before editing, then reload:

```bash
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak-$(date +%Y%m%d-%H%M%S)
nginx -t                # validate syntax first
systemctl reload nginx
```

The impact is *enormous* — `palettes.jsonc` drops from 330 KB to 18 KB
on the wire (~17×), and the renderer JS bundle from 2.5 MB to 765 KB
(~3.3×). Verify:

```bash
curl -sI -H 'Accept-Encoding: gzip' \
  'https://<your-domain>/octane/assets/octane-renderer-XXXXX.js' \
  | grep -i 'content-encoding'
# expected: content-encoding: gzip
```

If you forget `application/json` and `application/jsonc` from `gzip_types` you lose the
gamedata compression — that's the one that matters the most because
the gamedata files are by far the heaviest payload.

### 5.2 Long Cache-Control on gamedata

Inside the `/nitro-assets/` or `/nitro-assets/` location
block, the gamedata `.jsonc` files deserve a 30-day cache because
they only change on deploy:

```nginx
location /nitro-assets/ {
    alias /var/www/cmsjs/public/nitro-assets/;
    try_files $uri ${uri}manifest.jsonc ${uri}manifest.json =404;
    autoindex off;
    default_type application/json;
    expires 7d;
    add_header Cache-Control "public, max-age=604800, immutable";

    location ~ \.jsonc$ {
        types {} default_type application/jsonc;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    location ~ \.json$ {
        types {} default_type application/json;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
}
```

The outer 7-day cache covers PNG / nitro / mp3 files. The inner
location block raises the JSONC lifetime to 30 days because the
content is effectively immutable per deploy. Cloudflare honours
`Last-Modified` so revalidation still works — you don't need to
cache-bust by filename.

For the JS / CSS chunks the filenames are content-hashed by Vite, so
a long cache is safe — apply the same `Cache-Control: max-age=2592000`
to the `/octane/assets/` location.

### 5.3 The `try_files → manifest.jsonc` fallback

`loadGamedata(url)` in the renderer SDK can be pointed at either a
single JSON file or a directory containing `manifest.jsonc` + tier
sub-directories. The directory pattern is what we use in production,
so requests like `/nitro-assets/gamedata/figuremap/` (note the
trailing slash) need to resolve to the directory's manifest.

The `try_files $uri ${uri}manifest.jsonc ${uri}manifest.json =404;`
above does exactly that — try the URI as-is, fall back to the
`manifest.jsonc` inside the directory, fall back to `.json` for
legacy deploys, then 404. Without it nginx returns 403 (autoindex
off) on directory URLs and the loader cascades into the manifest 404
path.

---

## 6. Server-side: Windows + IIS deployment

You can reach the same 4 s cold load on Windows Server with IIS. The
same three wins (gzip, long cache, JSONC fallback) are replicable —
syntax changes, performance ceiling doesn't.

### 6.1 Don't host Node inside IIS

`IISNode` is unmaintained. The current MS recommendation is to run
Node as a Windows service and let IIS reverse-proxy to it:

1. Install Node 22 LTS, run the CMS app as a Windows Service (via
   `nssm`, `pm2-windows-startup`, or a scheduled task on boot) bound
   to `127.0.0.1:3003` — same layout as `docker-compose.yml` on the
   Linux host.
2. Install Arcturus separately as a Windows service running
   `Habbo-x.y.z-jar-with-dependencies.jar` against MariaDB. WS ports
   30001 + 30002 stay on `127.0.0.1`.
3. IIS handles HTTPS termination, static file serving, compression
   and reverse-proxying `/api/*` + `/client` + the Inertia entry
   point to `127.0.0.1:3003`.

Install these IIS features (Server Manager → Web Server → Add Roles
& Features):

- **URL Rewrite** — proxy rules
- **Application Request Routing (ARR)** — lets IIS act as a forward
  proxy; *enable proxy in the ARR feature page* after install
- **WebSocket Protocol** — required for the Arcturus WS upgrade
- **Static Content** + **Static Content Compression**
- **Dynamic Content Compression** — **off by default**, this is the
  single most important toggle on a vanilla Windows Server

### 6.2 Enable compression site-wide

IIS Manager → site → **Compression** feature → tick *both*
"Enable dynamic content compression" and "Enable static content
compression". Equivalent of nginx's `gzip on;`.

Without ticking both you ship raw bytes. Static covers JS / CSS /
JSON files, Dynamic covers Node responses (HTML from the Inertia
render). Add `application/json` to the compressor (and `.jsonc` to
its MIME map) in `applicationHost.config` or the site's `web.config`:

```xml
<system.webServer>
  <httpCompression directory="%SystemDrive%\inetpub\temp\IIS Temporary Compressed Files">
    <scheme name="gzip" dll="%Windir%\system32\inetsrv\gzip.dll"
            staticCompressionLevel="6" dynamicCompressionLevel="6" />
    <dynamicTypes>
      <add mimeType="application/json" enabled="true" />
      <add mimeType="application/javascript" enabled="true" />
      <add mimeType="text/css" enabled="true" />
      <add mimeType="text/javascript" enabled="true" />
      <add mimeType="text/*" enabled="true" />
    </dynamicTypes>
    <staticTypes>
      <add mimeType="application/json" enabled="true" />
      <add mimeType="application/javascript" enabled="true" />
      <add mimeType="text/css" enabled="true" />
      <add mimeType="text/javascript" enabled="true" />
      <add mimeType="image/svg+xml" enabled="true" />
      <add mimeType="font/ttf" enabled="true" />
      <add mimeType="font/otf" enabled="true" />
      <add mimeType="application/font-woff" enabled="true" />
      <add mimeType="application/vnd.ms-fontobject" enabled="true" />
    </staticTypes>
  </httpCompression>
</system.webServer>
```

Verify with PowerShell:

```powershell
Invoke-WebRequest -Uri 'https://<your-domain>/nitro-assets/gamedata/figuredata/core/palettes.jsonc' `
                  -Headers @{ 'Accept-Encoding' = 'gzip' } `
                  -MaximumRedirection 0 | Select-Object -ExpandProperty Headers
# expected: Content-Encoding = gzip
```

### 6.3 Long cache for gamedata

Drop a `web.config` inside the `nitro-assets/` virtual
directory (or nest under `<location>`):

```xml
<location path="nitro-assets">
  <system.webServer>
    <staticContent>
      <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="30.00:00:00" />
      <mimeMap fileExtension=".jsonc" mimeType="application/jsonc" />
      <mimeMap fileExtension=".nitro" mimeType="application/octet-stream" />
    </staticContent>
  </system.webServer>
</location>
```

`30.00:00:00` is the IIS TimeSpan for 30 days — same effect as
`Cache-Control: public, max-age=2592000` on nginx.

Set a separate, shorter cache (e.g. 5 minutes) on `index.html` so
deploys propagate without forcing visitors to clear their cache.

### 6.4 Directory → manifest.jsonc fallback

nginx's `try_files $uri ${uri}manifest.jsonc ${uri}manifest.json =404;`
has no native IIS equivalent. Use **URL Rewrite** to chain two rules
inside the same `<location>`:

```xml
<system.webServer>
  <rewrite>
    <rules>
      <rule name="gamedata-dir-to-manifest-jsonc" stopProcessing="true">
        <match url="^(nitro-assets/gamedata/[^?]+)/$" />
        <conditions>
          <add input="{REQUEST_FILENAME}/manifest.jsonc" matchType="IsFile" />
        </conditions>
        <action type="Rewrite" url="{R:1}/manifest.jsonc" />
      </rule>
      <rule name="gamedata-dir-to-manifest-json" stopProcessing="true">
        <match url="^(nitro-assets/gamedata/[^?]+)/$" />
        <conditions>
          <add input="{REQUEST_FILENAME}/manifest.json" matchType="IsFile" />
        </conditions>
        <action type="Rewrite" url="{R:1}/manifest.json" />
      </rule>
    </rules>
  </rewrite>
</system.webServer>
```

### 6.5 Reverse proxy to Node + WebSocket upgrade

Once ARR is installed and proxy enabled (IIS Manager → server node →
ARR → Server Proxy Settings → check "Enable proxy"), add a top-level
rule that forwards everything *not* matching a static file:

```xml
<system.webServer>
  <rewrite>
    <rules>
      <rule name="reverse-proxy-to-node" stopProcessing="true">
        <match url="(.*)" />
        <conditions>
          <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
        </conditions>
        <action type="Rewrite" url="http://127.0.0.1:3003/{R:1}" />
        <serverVariables>
          <set name="HTTP_X_FORWARDED_FOR" value="{REMOTE_ADDR}" />
          <set name="HTTP_X_FORWARDED_PROTO" value="https" />
          <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
        </serverVariables>
      </rule>
      <rule name="ws-proxy" stopProcessing="true">
        <match url="^ws/(.*)" />
        <action type="Rewrite" url="http://127.0.0.1:30001/{R:1}" />
      </rule>
    </rules>
  </rewrite>
</system.webServer>
```

ARR transparently handles the WebSocket upgrade once the WebSocket
Protocol IIS feature is installed.

### 6.6 IIS trade-offs (honest)

- **Compression CPU**: IIS dynamic compression is more CPU-hungry than
  nginx's worker-pool gzip. On 2-vCPU droplets expect ~10-15 % extra
  CPU during peak concurrency.
- **Docker overhead**: Docker Desktop on Windows goes through the
  WSL2 file-system bridge. Bind-mounting Linux-style paths into a
  container is measurably slower than the same on a native Linux
  host. Recommendation: run Node + Arcturus as native Windows
  services, *not* containerised.
- **Java JDBC on Windows**: Arcturus's JDBC pool exhibits slightly
  higher lock-wait under concurrent room load on Windows than on
  Linux. Re-tune `db.pool.maxsize` if you saturate.

Browser-perceived performance is identical to nginx once the config
above is in place. The 4 s cold-load target is achievable on any
Windows Server 2019 / 2022 box.

The one deployment to **avoid**: shared Windows hosting where the
hoster doesn't let you enable Dynamic Compression at the application
host level. You stay stuck at the 60-90 s baseline because neither
Node's gzip nor IIS's compressor can be turned on.

---

## 7. End-to-end verification

Run each probe in order — they walk the request through every layer
covered above. A green light on all four means the cold load is
correctly tuned.

```bash
# 1. Build artefact has the granular chunks
yarn build
ls dist/assets/ | grep -E '^(vendor|octane-renderer)-' | wc -l
# expected: ~12-14 chunks

# 2. Server is compressing JSONC (or JS — pick either)
curl -sI -H 'Accept-Encoding: gzip' \
  'https://<your-domain>/nitro-assets/gamedata/figuredata/core/palettes.jsonc' \
  | grep -iE 'content-encoding|cache-control'
# expected:
# content-encoding: gzip
# cache-control: public, max-age=2592000

# 3. Directory → manifest.jsonc fallback
curl -sI 'https://<your-domain>/nitro-assets/gamedata/figuremap/' \
  | head -1
# expected: HTTP/2 200 (not 403 or 404)

# 4. LoadingView renders the progress bar — easiest from the live site:
# DevTools → Performance → Record → reload /client
# Look for the progress bar transitioning 5→100% within 4s on a
# warm-cache load, ~10-20s on a cold one with empty CF cache.

# 5. Remember-token captured to localStorage:
# DevTools → Application → Local Storage → check nitro.auth.remember
# is populated after the first successful load.
```

If the build artefact is correct but the live site doesn't pick up
the new chunks, the deploy didn't replace `dist/` on the server.
Wipe the target dir's `assets/*.js` and `src/assets/*.css` before
extracting the new tarball — old chunk filenames stick around
otherwise.
