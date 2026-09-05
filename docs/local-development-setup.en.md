# Local Development Setup with `yarn start`

This guide explains how to run Octane locally with Vite, using:

- local UI on `http://localhost:5173`;
- local API/emulator on `http://localhost:2096`;
- local WebSocket on `ws://localhost:2096`;
- remote plain assets and gamedata, so you do not need to copy the full `client/nitro` folder locally.

## 1. Start the emulator

Inside `Arcturus-Morningstar-Extended/Emulator`, start the emulator with WebSocket enabled.

Recommended local `config.ini` values:

```ini
ws.enabled=true
ws.host=0.0.0.0
ws.port=2096
ws.whitelist=*
ws.ip.header=

crypto.ws.enabled=0

nitro.secure.assets.enabled=false
nitro.secure.api.enabled=false
```

For local development, it is easier to disable:

- `crypto.ws.enabled`;
- `nitro.secure.assets.enabled`;
- `nitro.secure.api.enabled`.

This keeps debugging simple and avoids the secure runtime layer.

## 2. `public/configuration/client-mode.json`

File:

```txt
octane/public/configuration/client-mode.json
```

Recommended local config:

```json
{
    "distObfuscationEnabled": true,
    "secureAssetsEnabled": false,
    "secureApiEnabled": false,
    "apiBaseUrl": "http://localhost:2096",
    "plainConfigBaseUrl": "http://localhost:5173/configuration/",
    "plainGamedataBaseUrl": "https://hotel.example.com/client/octane/gamedata/"
}
```

Notes:

- `secureAssetsEnabled=false` avoids `/nitro-sec/file`.
- `secureApiEnabled=false` avoids encrypted `/api/*` requests.
- `apiBaseUrl` must point to your local emulator.
- `plainGamedataBaseUrl` can stay remote if you do not have gamedata copied locally.

If you want everything local, use:

```json
"plainGamedataBaseUrl": "http://localhost:5173/client/octane/gamedata/"
```

but the files must really exist under:

```txt
octane/public/client/octane/gamedata/
```

## 3. `public/configuration/renderer-config.json`

File:

```txt
octane/public/configuration/renderer-config.json
```

Minimum local values:

```json
{
    "socket.url": "ws://localhost:2096",
    "api.url": "http://localhost:2096",
    "crypto.ws.enabled": false,
    "gamedata.url": "https://hotel.example.com/client/octane/gamedata",
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
    "login.endpoint": "${api.url}/api/auth/login",
    "login.register.endpoint": "${api.url}/api/auth/register",
    "login.forgot.endpoint": "${api.url}/api/auth/forgot-password",
    "login.logout.endpoint": "${api.url}/api/auth/logout",
    "login.remember.endpoint": "${api.url}/api/auth/remember",
    "login.health.endpoint": "${api.url}/api/health",
    "login.health.method": "GET",
    "login.check-email.endpoint": "${api.url}/api/auth/check-email",
    "login.check-username.endpoint": "${api.url}/api/auth/check-username",
    "login.register.imaging.url": "${api.url}/api/avatar/imaging",
    "login.news.url": "${api.url}/api/auth/news",
    "badges.custom.list.endpoint": "${api.url}/api/badges/custom",
    "badges.custom.create.endpoint": "${api.url}/api/badges/custom",
    "badges.custom.update.endpoint": "${api.url}/api/badges/custom/%badgeId%",
    "badges.custom.delete.endpoint": "${api.url}/api/badges/custom/%badgeId%",
    "badges.custom.texts.endpoint": "${api.url}/api/badges/custom/texts"
}
```

Important:

- Do not use `https://localhost:2096/nitro-sec/file` locally if `secureAssetsEnabled=false`.
- Do not use `ws://192.168.x.x/:2096`; it is malformed. Use `ws://localhost:2096` or `ws://192.168.x.x:2096`.

## 4. `public/configuration/ui-config.json`

File:

```txt
octane/public/configuration/ui-config.json
```

For the login view, you can use remote plain images:

```json
{
    "loginview": {
        "images": {
            "background": "https://hotel.example.com/client/octane/images/reception/background_gradient_apr25.png",
            "background.colour": "#6eadc8",
            "drape": "https://hotel.example.com/client/octane/images/reception/drape.png",
            "left": "https://hotel.example.com/client/octane/images/reception/mute_reception_backdrop_left.png",
            "right": "https://hotel.example.com/client/octane/images/reception/background_right.png"
        }
    }
}
```

If you see `ERR_NAME_NOT_RESOLVED`, the configured domain does not exist or is not reachable.

## 5. Database-backed news

Login news should come from the database through the emulator.

In renderer config use:

```json
"login.news.url": "${api.url}/api/auth/news"
```

The emulator reads from:

```txt
ui_news
```

Reference SQL:

```txt
Arcturus-Morningstar-Extended/Database Updates/013_UI_Client_News.sql
```

Main columns:

- `title`
- `body`
- `image`
- `link_text`
- `link_url`
- `enabled`
- `sort_order`

`public/configuration/news.json` can stay as a mock/fallback only, but it is not the correct production flow.

## 6. Start Octane

Inside `octane`:

```bash
yarn start
```

Open:

```txt
http://localhost:5173
```

Recommendation: use `localhost`, not `192.168.x.x`, because cookies and API sessions are host-based and can otherwise cause `401 Unauthorized`.

## 7. Common errors

### `Unable to load renderer-config.json`

Check:

```txt
public/configuration/client-mode.json
```

It must contain:

```json
"secureAssetsEnabled": false
```

### `Invalid JSON ... Unexpected token '<'`

The client requested JSON, but Vite returned HTML.

This happens when a URL points to a file that does not exist, for example:

```txt
http://localhost:5173/client/octane/gamedata/ExternalTexts.json
```

Fix:

- use remote plain gamedata;
- or copy the gamedata files into `public/client/octane/gamedata`.

### WebSocket `1006`

Check:

```json
"socket.url": "ws://localhost:2096"
```

and emulator config:

```ini
ws.enabled=true
ws.port=2096
```

### Custom badges `401 Unauthorized`

This is normal if you are not logged in or if you open Octane from a different host.

Use:

```txt
http://localhost:5173
```

and API:

```txt
http://localhost:2096
```

## 8. Difference from production

Local `yarn start`:

```html
<script type="module" src="/src/bootstrap.ts"></script>
```

Production build:

```html
<script src="/configuration/bootstrap.js"></script>
```

Do not mix the two flows.
