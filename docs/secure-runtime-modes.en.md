# Secure runtime modes

This document summarizes all values you may need to configure for:

- `dist` bundle obfuscation (`app.js` / `app.css` → `.dat`)
- secure runtime assets (`configuration/config.jsonc`, the files in `configuration/config/`, `gamedata`)
- secure runtime API (`/api/*`)
- plain fallbacks when you want to disable the secure layer without removing the code

## 1. `octane/public/configuration/client-mode.json`

This file controls everything at runtime.

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

### Fields

- `distObfuscationEnabled`
  - `true`: `asset-loader.js` loads `app.css.dat` and `app.js.dat`
  - `false`: it loads plain `assets/app.css` and `assets/app.js`

- `secureAssetsEnabled`
  - `true`: `bootstrap.ts` and `secure-assets.ts` use `/nitro-sec/file`
  - `false`: `configuration/config.jsonc`, the files in `configuration/config/`, and gamedata are loaded in plain mode

- `secureApiEnabled`
  - `true`: the `fetch` wrapper encrypts `/api/*` requests
  - `false`: `/api/*` requests stay plain

- `apiBaseUrl`
  - Octane emulator / API base URL
  - example: `https://nitro.example.com:2096`
  - it is best to always set this explicitly, so you do not depend on the hardcoded fallback

- `plainConfigBaseUrl`
  - base URL for plain config files
  - usually: `https://hotel.example.com/configuration/`

- `plainGamedataBaseUrl`
  - base URL for plain gamedata files
  - usually: `https://hotel.example.com/client/octane/gamedata/`

## 2. `octane/src/bootstrap.ts`

`bootstrap.ts`:

- installs the secure fetch wrapper
- reads `window.__octaneClientMode`
- reads `configuration/config.jsonc` and its `"config.files"` list (`src/api/configuration/configurationFiles.ts`)
- builds `OctaneConfig['config.urls']` from those files, in the same order (for the same key, the later file wins)

When `config.jsonc` is missing, unreadable or lists nothing usable, it loads the old `renderer-config.json` +
`ui-config.json` as before: a hotel that has not moved its configuration yet keeps working.

### Current behavior

- if `secureAssetsEnabled=true`
  - it uses `secureUrl('config', 'config.jsonc', true)` for the base
  - it uses `secureUrl('config', <file>, true)` for each listed file, e.g. `config/server.jsonc` (the server accepts sub-folders)

- if `secureAssetsEnabled=false`
  - it uses plain files with cache busting (`?v=...`)

### Important note

The current fallback is:

```ts
(window as any).OctaneSecureApiUrl = clientMode.apiBaseUrl || 'https://nitro.example.com:2096/';
```

So in production it is better to always set `apiBaseUrl` inside `configuration/client-mode.json`.

## 3. `octane/src/secure-assets.ts`

This file contains the runtime logic for:

- ECDH bootstrap
- asset decrypt/encrypt
- secure `/api/*`
- plain fallback when the toggles are disabled

### In practice

- it reads flags from `window.__octaneClientMode`
- if `secureAssetsEnabled=false`
  - it automatically rewrites `/nitro-sec/file?...` into plain URLs
- if `secureApiEnabled=false`
  - it does not encrypt `/api/*`

Normally you should not need to touch it unless you want to change the secure protocol itself.

## 4. `octane/public/configuration/config/server.jsonc`

The `Server and connection` and `Assets and game data` sections of this file define the paths used by the renderer
(they used to live in `renderer-config.json`). The file is JSONC, with a `//` comment above every key: the JSON mode
must be `jsonc` or `auto`.

### Things to check

- `api.url` (section `Server and connection`)
- `socket.url` (section `Server and connection`)
- `gamedata.url` (from here down, section `Assets and game data`)
- `external.texts.url`
- `external.texts.translation.url`
- `furnidata.url`
- `furnidata.translation.url`

### With secure assets enabled

You can use:

```json
"gamedata.url": "https://nitro.example.com:2096/nitro-sec/file?kind=gamedata&file="
```

and the equivalent secure URLs for the other gamedata resources.

### With secure assets disabled

You can use plain classic paths, for example:

```json
"gamedata.url": "https://hotel.example.com/client/octane/gamedata"
```

or you can keep the renderer config as-is and let `secure-assets.ts` handle the fallback conversion.

## 5. The other files in `octane/public/configuration/config/`: `hotel.json`, `features.json`, `data.json`

There is no secure logic here, but they are files loaded through `config.urls` (what used to be in `ui-config.json`).
To find which file holds a key, search `config.example/` for it.

If `secureAssetsEnabled=true`, they are served from `/nitro-sec/file`.
If `secureAssetsEnabled=false`, they are loaded from the static files with `?v=...`.

So you only need to maintain their content correctly.

## 6. `octane/scripts/write-asset-loader.mjs`

This script generates `public/configuration/asset-loader.js`.

### What it does now

- renders the initial shell
- reads `configuration/client-mode.json`
- decides whether to load:
  - `app.css.dat` / `app.js.dat`
  - or `assets/app.css` / `assets/app.js`

### Important

If you modify this script, the updated loader is regenerated on the next:

```bash
yarn build
```

because `package.json` already contains:

```json
"prebuild": "node scripts/write-asset-loader.mjs"
```

## 7. `octane/scripts/minify-dist.mjs`

This script now:

- generates the `.dat` files
- keeps the original `app.css` and `app.js` files too

This is required, otherwise `distObfuscationEnabled=false` would not have a working fallback.

## 8. `Arcturus-Morningstar-Extended/Latest_Compiled_Version/config.ini.example`

The current backend flags are:

```ini
nitro.secure.assets.enabled=true
nitro.secure.api.enabled=true
nitro.secure.config.root=
nitro.secure.gamedata.root=
nitro.secure.master_key=change-me-to-a-long-random-secret
```

### Meaning

- `nitro.secure.assets.enabled`
  - enables `/nitro-sec/bootstrap` and `/nitro-sec/file`

- `nitro.secure.api.enabled`
  - enables the secure layer for `/api/*`

- `nitro.secure.config.root`
  - folder used to read `configuration/config.jsonc` and the `configuration/config/` folder: it must hold both

- `nitro.secure.gamedata.root`
  - folder used to read live gamedata

- `nitro.secure.master_key`
  - persistent server-side secret
  - especially important when running behind Cloudflare / multiple backend requests

## 9. Example setups

### Everything enabled

`configuration/client-mode.json`

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

`config.ini`

```ini
nitro.secure.assets.enabled=true
nitro.secure.api.enabled=true
nitro.secure.config.root=C:/inetpub/wwwroot/paxxo/nitro
nitro.secure.gamedata.root=C:/inetpub/wwwroot/paxxo/octane/client/octane/gamedata
nitro.secure.master_key=a-long-random-secret
```

### `.dat` only, no secure assets/API

`configuration/client-mode.json`

```json
{
    "distObfuscationEnabled": true,
    "secureAssetsEnabled": false,
    "secureApiEnabled": false,
    "apiBaseUrl": "https://nitro.example.com:2096",
    "plainConfigBaseUrl": "https://hotel.example.com/configuration/",
    "plainGamedataBaseUrl": "https://hotel.example.com/client/octane/gamedata/"
}
```

`config.ini`

```ini
nitro.secure.assets.enabled=false
nitro.secure.api.enabled=false
```

### Everything plain

`configuration/client-mode.json`

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

## 10. When rebuild is required

### No rebuild required

For changes to:

- `configuration/client-mode.json`
- `configuration/config.jsonc`
- the files in `configuration/config/`
- live gamedata
- `config.ini`

### Rebuild required

For changes to:

- `src/bootstrap.ts`
- `src/secure-assets.ts`
- `scripts/write-asset-loader.mjs`
- `scripts/minify-dist.mjs`

## 11. Deployment note

To make the toggles work properly:

- always deploy both plain files and `.dat` files
- make sure IIS / your host serves the `.dat` MIME type
- if you disable secure mode on the client, disable it on the backend too for consistency

## 12. Quick checklist

- `configuration/client-mode.json` configured
- `apiBaseUrl` correct
- `nitro.secure.master_key` set
- `nitro.secure.config.root` correct
- `nitro.secure.gamedata.root` correct
- both `.dat` and plain files deployed
- `.dat` MIME type configured on the web server


