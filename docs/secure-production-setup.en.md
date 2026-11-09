# Secure Runtime Production Setup

Quick setup guide for running Octane with:

- configuration and gamedata served through `/nitro-sec/file`;
- encrypted runtime `/api/*` calls;
- obfuscated production bundles loaded as `.dat`.

Replace the example domains with your real domains:

- `https://hotel.example.com`
- `https://nitro.example.com:2096`

Shortcut: `node install.mjs --secure=on --emulator-config=<path>/config.ini` sets the `client-mode.json` flags
(section 2), generates `nitro.secure.master_key` and updates `config.ini` (section 5, with a backup).
Without `--emulator-config` it prints the lines to paste. A master key that is already set is never replaced.
`nitro.secure.config.root` and `nitro.secure.gamedata.root` still have to be set by hand.

## 1. Build Octane

Inside the `octane` repository:

```bash
yarn build
```

Then publish the `dist` folder to your web server, for example:

```txt
C:/inetpub/wwwroot/hotel/nitro
```

The deployed folder should contain at least:

```txt
configuration/
assets/
asset-loader.js
index.html
src/
```

## 2. `configuration/client-mode.json`

File:

```txt
octane/dist/configuration/client-mode.json
```

Secure production configuration:

```json
{
    "distObfuscationEnabled": true,
    "secureAssetsEnabled": true,
    "secureApiEnabled": true,
    "apiBaseUrl": "https://nitro.example.com:2096",
    "plainConfigBaseUrl": "https://hotel.example.com/configuration/",
    "plainGamedataBaseUrl": "https://hotel.example.com/client/octane/gamedata/"
}
```

Meaning:

- `distObfuscationEnabled: true` loads `app.js.dat` and `app.css.dat`.
- `secureAssetsEnabled: true` loads `renderer-config.json`, `ui-config.json`, and gamedata through `/nitro-sec/file`.
- `secureApiEnabled: true` automatically encrypts `/api/*` requests.
- `apiBaseUrl` must point to the emulator/API.
- `plainConfigBaseUrl` and `plainGamedataBaseUrl` are fallbacks when secure assets are disabled.
- If `/nitro-sec/bootstrap` does not answer with a key (secure off on the server, an older emulator, a network error), the client loads config, gamedata and `/api` in the clear instead of failing, and tries the encrypted path again after 5 minutes. With `nitro.secure.api.required=true` the server still refuses plain calls to `/api/auth/*` and `/api/badges/*` with 403.
- The client renews its key every `nitro.secure.session_ttl_sec` seconds of the server (between 60 and 3600; 300 when the server does not say).

## 3. `configuration/renderer-config.json`

File:

```txt
octane/dist/configuration/renderer-config.json
```

Important values:

```json
{
    "socket.url": "wss://nitro.example.com:2096",
    "api.url": "https://nitro.example.com:2096",
    "gamedata.url": "https://nitro.example.com:2096/nitro-sec/file?kind=gamedata&file=",
    "external.texts.url": [
        "${gamedata.url}/ExternalTexts.json",
        "${gamedata.url}/UITexts.json"
    ],
    "furnidata.url": "${gamedata.url}/FurnitureData.json?t=%timestamp%",
    "productdata.url": "${gamedata.url}/ProductData.json?t=%timestamp%",
    "avatar.actions.url": "${gamedata.url}/HabboAvatarActions.json?t=%timestamp%",
    "avatar.figuredata.url": "${gamedata.url}/FigureData.json?t=%timestamp%",
    "avatar.figuremap.url": "${gamedata.url}/FigureMap.json?t=%timestamp%",
    "avatar.effectmap.url": "${gamedata.url}/EffectMap.json?t=%timestamp%",
    "crypto.ws.enabled": true
}
```

If you are not using WebSocket crypto yet, use:

```json
"crypto.ws.enabled": false
```

## 4. `configuration/ui-config.json`

File:

```txt
octane/dist/configuration/ui-config.json
```

Static image and camera URLs can remain plain:

```json
{
    "camera.url": "https://hotel.example.com/client/camera/",
    "thumbnails.url": "https://hotel.example.com/client/camera/thumbnail/%thumbnail%.png"
}
```

Non-sensitive images can stay static. JSON configuration and gamedata should go through the secure endpoint.

## 5. Emulator `config.ini`

Inside `Arcturus-Morningstar-Extended`, edit the emulator config:

```txt
Emulator/config.ini
```

Production example:

```ini
ws.enabled=true
ws.host=0.0.0.0
ws.port=2096
ws.whitelist=https://hotel.example.com
ws.ip.header=CF-Connecting-IP

crypto.ws.enabled=1

nitro.secure.assets.enabled=true
nitro.secure.api.enabled=true
nitro.secure.config.root=C:/inetpub/wwwroot/hotel/octane/configuration
nitro.secure.gamedata.root=C:/inetpub/wwwroot/hotel/octane/client/octane/gamedata
nitro.secure.master_key=change-this-to-a-long-random-secret

login.remember.enabled=true
login.remember.duration.days=30
login.remember.jwt.secret=change-this-too-if-you-use-remember-me
```

Notes:

- `nitro.secure.config.root` must point to the folder containing `renderer-config.json`, `ui-config.json`, and `client-mode.json`.
- `nitro.secure.gamedata.root` must point to the live gamedata folder.
- Files are read live from disk: if you update a JSON file, a new browser refresh reads the new version.
- `nitro.secure.master_key` must be secret and stable. Never put it in public files.

## 6. Cloudflare

If you use Cloudflare:

1. Keep the proxy enabled for the website domain `hotel.example.com`.
2. Make sure Cloudflare supports/proxies the port used by `nitro.example.com:2096`.
3. Always use HTTPS/WSS in the browser:

```json
"api.url": "https://nitro.example.com:2096",
"socket.url": "wss://nitro.example.com:2096"
```

If you get CORS errors, check:

```ini
ws.whitelist=https://hotel.example.com
```

## 7. IIS / `.dat` MIME type

If obfuscated `.dat` assets are enabled, IIS must serve them correctly.

Add this MIME type:

```txt
Extension: .dat
MIME type: application/octet-stream
```

Without it, the browser can receive 404 even when the file exists.

## 8. Final checklist

- `client-mode.json` has `secureAssetsEnabled=true`.
- `client-mode.json` has `secureApiEnabled=true`.
- `renderer-config.json` uses `/nitro-sec/file?kind=gamedata&file=`.
- `api.url` points to `https://nitro.example.com:2096`.
- `socket.url` points to `wss://nitro.example.com:2096`.
- `config.ini` has the correct `nitro.secure.config.root`.
- `config.ini` has the correct `nitro.secure.gamedata.root`.
- `config.ini` has a stable `nitro.secure.master_key`.
- IIS knows the `.dat` MIME type.
- Restart the emulator after changing `config.ini`.
- Refresh the browser after changing JSON files in `configuration` or `gamedata`.

## 9. Temporarily disable secure mode

For quick debugging, only change `client-mode.json`:

```json
{
    "distObfuscationEnabled": false,
    "secureAssetsEnabled": false,
    "secureApiEnabled": false,
    "apiBaseUrl": "https://nitro.example.com:2096",
    "plainConfigBaseUrl": "https://hotel.example.com/configuration/",
    "plainGamedataBaseUrl": "https://hotel.example.com/client/octane/gamedata/"
}
```

Then hard refresh the browser.

## 10. `configuration/bootstrap.js`

File:

```txt
octane/dist/configuration/bootstrap.js
```

This is the first loader when you use the external secure mode.

It does three things:

1. opens an ECDH session with the emulator through `/nitro-sec/bootstrap`;
2. downloads encrypted `client-mode.json` through `/nitro-sec/file?kind=config`;
3. downloads encrypted `asset-loader.js` and imports it as a JavaScript module.

### Value to check

Inside `bootstrap.js` there is:

```js
const API_BASE = "https://nitro.example.com:2096";
```

It must point to your public emulator/API URL.

In production:

```js
const API_BASE = "https://nitro.example.com:2096";
```

In local development:

```js
const API_BASE = "http://localhost:2096";
```

If `bootstrap.js` fails, it automatically falls back to the plain loader:

```txt
configuration/asset-loader.js
```

So `asset-loader.js` must always exist inside the `configuration` folder.

## 11. `configuration/asset-loader.js`

File:

```txt
octane/dist/configuration/asset-loader.js
```

This loader loads the actual bundle:

- if `distObfuscationEnabled=true`
  - it loads `app.css.dat`;
  - it loads `app.js.dat`;
  - it decodes, decompresses, and imports the bundle from a blob.

- if `distObfuscationEnabled=false`
  - it loads `assets/app.css`;
  - it loads `assets/app.js`.

### Required files in production

With obfuscation enabled, these files must exist:

```txt
assets/app.css.dat
assets/app.js.dat
configuration/asset-loader.js
configuration/bootstrap.js
configuration/client-mode.json
```

With obfuscation disabled, these files must exist:

```txt
assets/app.css
assets/app.js
configuration/asset-loader.js
configuration/client-mode.json
```

## 12. `index.html`

`index.html` should stay minimal.

Secure production example:

```html
<div id="root"></div>
<script src="/configuration/bootstrap.js"></script>
```

Vite development example:

```html
<div id="root"></div>
<script type="module" src="/src/bootstrap.ts"></script>
```

Do not mix the two flows:

- production build: use `configuration/bootstrap.js`;
- `yarn start` development: use `/src/bootstrap.ts`.

## 13. Files inside `/configuration`

The `configuration` folder should contain:

```txt
asset-loader.js
bootstrap.js
client-mode.json
renderer-config.json
ui-config.json
adsense.json              optional
hotlooks.json             if register hot looks are enabled
UITexts.json              if separate UI texts are enabled
```

Login news should not live in `news.json` in production. They come from the database through:

```json
"login.news.url": "${api.url}/api/auth/news"
```

The emulator reads from the `ui_news` table.

With `secureAssetsEnabled=true`, client-loaded files go through:

```txt
https://nitro.example.com:2096/nitro-sec/file?kind=config&file=...
```

The emulator reads them from:

```ini
nitro.secure.config.root=C:/inetpub/wwwroot/hotel/octane/configuration
```

If you add new JSON/JS files inside `configuration` and want to protect them, they must be requested through the secure endpoint or loaded through `bootstrap.js`.

## 14. Content-Security-Policy

A CSP tells the browser where the client may load scripts, frames and connections from: if a plugin, an ad or
injected HTML tries to load anything else, the browser blocks it. `index.html` carries only the rules that hold for
every hotel (`object-src 'none'; base-uri 'self'`); the full policy depends on the hotel's hosts and belongs in the web
server's headers.

A starting point to adapt (replace the example hosts with those of `client-mode.json`, `renderer-config.json` and
`ui-config.json`):

```txt
default-src 'self';
script-src 'self' blob: 'unsafe-eval' https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://assets.example.com https://images.example.com;
media-src 'self' blob: https://radio.example.com;
connect-src 'self' https://api.example.com wss://game.example.com https://assets.example.com;
frame-src https://challenges.cloudflare.com https://player.vimeo.com https://www.youtube-nocookie.com https://ads.example.net;
font-src 'self' data:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'self' https://cms.example.com
```

- **`'unsafe-eval'`** is needed today by PixiJS, which compiles its shader functions at run time. It can go once the
  renderer loads `pixi.js/unsafe-eval`.
- **`blob:`** in `script-src` is for `asset-loader.js`, which imports the unpacked bundle from a blob.
- **External plugins**: every `external.plugins` host must be added to `script-src`, and should also be listed in
  `external.plugins.allowed.hosts`.
- **Ads**: with `ads.frame.url` (section 15) their origin in `frame-src` is enough; AdSense straight in the client
  needs the Google domains in `script-src`, `img-src`, `connect-src` and `frame-src` instead.
- **`frame-ancestors`**: list the CMS that embeds the client, or keep `'self'`.

Before enforcing it, send it as `Content-Security-Policy-Report-Only`: the browser reports in the console what it
would have blocked, without blocking it. Once the console is clean on login, hotel view, a room, the catalog and the
games, switch to `Content-Security-Policy`.

IIS (`web.config` in the client folder):

```xml
<system.webServer>
  <httpProtocol>
    <customHeaders>
      <add name="Content-Security-Policy-Report-Only" value="default-src 'self'; ..." />
    </customHeaders>
  </httpProtocol>
</system.webServer>
```

nginx:

```nginx
add_header Content-Security-Policy-Report-Only "default-src 'self'; ..." always;
```

### Remember token in a cookie

With `"login.remember.cookie": true` in `ui-config.json` the client asks the emulator to keep the remember token in an
HttpOnly cookie on `/api/auth`, which no script can read. In the emulator's `config.ini`:

```ini
login.remember.cookie.name=octane_remember
# Strict when the client and the API are on the same site; None when they are on different sites (https only)
login.remember.cookie.samesite=Strict
login.remember.cookie.secure=true
```

An emulator that does not know cookie mode answers with the token in the JSON, and the client stores it as before.

## 15. Ads on a separate origin

The AdSense script, loaded in the client, runs on the same origin as the session. To keep it out:

1. publish `configuration/ads-frame.html.example`, renamed to `ads-frame.html`, on another origin
   (e.g. `https://ads.example.net/ads-frame.html`), with its own `ads.txt`;
2. in `ui-config.json` set `"ads.frame.url": "https://ads.example.net/ads-frame.html"`.

The client then shows the ad in a sandboxed frame that may open the advertiser in a new tab but cannot navigate the
client, and passes the ad unit (from `ads.txt` and `adsense.json`) in the query. Without `ads.frame.url` the ad stays
in the client as before.
