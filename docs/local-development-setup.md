# Setup locale con `yarn start`

Questa guida serve per avviare Octane in locale con Vite, usando:

- UI locale su `http://localhost:5173`;
- API/emulatore locale su `http://localhost:2096`;
- WebSocket locale su `ws://localhost:2096`;
- asset e gamedata remoti plain, così non devi copiare tutta la cartella `client/nitro`.

## 1. Avvia l'emulatore

Nel repo `Arcturus-Morningstar-Extended/Emulator`, avvia l'emulatore con WebSocket attivo.

Nel tuo `config.ini` locale usa valori tipo:

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

Per il locale è meglio tenere spenti:

- `crypto.ws.enabled`;
- `nitro.secure.assets.enabled`;
- `nitro.secure.api.enabled`.

Così puoi debuggare senza layer secure in mezzo.

## 2. `public/configuration/client-mode.json`

File:

```txt
octane/public/configuration/client-mode.json
```

Config locale consigliato:

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

Note:

- `secureAssetsEnabled=false` evita `/nitro-sec/file`.
- `secureApiEnabled=false` evita cifratura `/api/*`.
- `apiBaseUrl` deve puntare all'emulatore locale.
- `plainGamedataBaseUrl` può rimanere remoto se non hai gamedata copiato in locale.

Se vuoi tutto locale, usa:

```json
"plainGamedataBaseUrl": "http://localhost:5173/client/octane/gamedata/"
```

ma devi avere davvero i file sotto:

```txt
octane/public/client/octane/gamedata/
```

## 3. `public/configuration/renderer-config.json`

File:

```txt
octane/public/configuration/renderer-config.json
```

Valori minimi locali:

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

Importante:

- Non usare `https://localhost:2096/nitro-sec/file` in locale se `secureAssetsEnabled=false`.
- Non usare `ws://192.168.x.x/:2096`: è malformato. Usa `ws://localhost:2096` oppure `ws://192.168.x.x:2096`.

## 4. `public/configuration/ui-config.json`

File:

```txt
octane/public/configuration/ui-config.json
```

Per la login view puoi usare immagini remote plain:

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

Se vedi `ERR_NAME_NOT_RESOLVED`, il dominio configurato non esiste o non è raggiungibile.

## 5. News dal database

Le news della login devono arrivare dal database tramite l'emulatore.

Nel renderer config usa:

```json
"login.news.url": "${api.url}/api/auth/news"
```

L'emulatore legge dalla tabella:

```txt
ui_news
```

SQL di riferimento:

```txt
Arcturus-Morningstar-Extended/Database Updates/013_UI_Client_News.sql
```

Colonne principali:

- `title`
- `body`
- `image`
- `link_text`
- `link_url`
- `enabled`
- `sort_order`

`public/configuration/news.json` può rimanere solo come mock/fallback, ma non è il flow corretto.

## 6. Avvio Octane

Nel repo `octane`:

```bash
yarn start
```

Apri:

```txt
http://localhost:5173
```

Consiglio: usa `localhost`, non `192.168.x.x`, perché cookie e sessioni API possono cambiare host e causare `401 Unauthorized`.

## 7. Errori comuni

### `Unable to load renderer-config.json`

Controlla:

```txt
public/configuration/client-mode.json
```

Deve avere:

```json
"secureAssetsEnabled": false
```

### `Invalid JSON ... Unexpected token '<'`

Vuol dire che il client ha chiesto un JSON, ma Vite ha risposto HTML.

Succede quando un URL punta a un file che non esiste, per esempio:

```txt
http://localhost:5173/client/octane/gamedata/ExternalTexts.json
```

Soluzione:

- usa gamedata remoto plain;
- oppure copia davvero i gamedata in `public/client/octane/gamedata`.

### WebSocket `1006`

Controlla:

```json
"socket.url": "ws://localhost:2096"
```

e nel config emulator:

```ini
ws.enabled=true
ws.port=2096
```

### `/api/maintenance` (o qualsiasi `/api/...`) `502 (Bad Gateway)`

Vite non è riuscito a raggiungere l'emulatore. In sviluppo ogni chiamata
`/api/...` viene inoltrata dal proxy di Vite (vedi `vite.config.mjs`) alla
porta WebSocket dell'emulatore, e il 502 è la risposta di Vite quando quella
connessione fallisce. La causa reale è nel terminale di `yarn start`:

```txt
[vite] http proxy error: /api/maintenance
Error: connect ECONNREFUSED 127.0.0.1:2096
```

Il target del proxy è, in quest'ordine: la variabile d'ambiente
`AUTH_PROXY_TARGET`, poi `"api.url"` di `public/configuration/renderer-config.json`,
poi `http://127.0.0.1:2096`. Ogni chiamata fallita stampa anche una riga
`[octane] /api proxy: ... failed (ECONNREFUSED)` con il target usato.

Controlla, in quest'ordine:

- l'emulatore è avviato e nel log compare
  `WebSocket server started on 0.0.0.0:2096 (SSL: false)`;
- `ws.host` è `0.0.0.0` (o `127.0.0.1`), non solo l'IP della LAN;
- `"api.url"` in `renderer-config.json` punta all'indirizzo e alla porta reali
  dell'emulatore (il proxy lo segue);
- se quella riga dice `SSL: true` (una coppia `ssl/cert.pem` + `privkey.pem`
  accanto all'emulatore), la porta parla TLS e il target deve essere `https://...`.

Per cambiare il target per un singolo avvio:

```sh
# Windows cmd
set AUTH_PROXY_TARGET=http://192.168.0.8:2096 && yarn start
# PowerShell
$env:AUTH_PROXY_TARGET='http://192.168.0.8:2096'; yarn start
# Linux / macOS
AUTH_PROXY_TARGET=http://192.168.0.8:2096 yarn start
```

`crypto.ws.enabled` e `crypto.ws.signing.enabled` riguardano solo la sessione
WebSocket dopo l'upgrade; non toccano mai queste chiamate HTTP.
Il `net::ERR_ABORTED` accanto al 502 è la pagina di login che annulla la
richiesta allo smontaggio ed è innocuo.

### La camminata sembra a scatti o cambia velocità

`system.fps.max` in `renderer-config.json` limita il render loop, e il client
usava 24 come default quando la chiave mancava. Pixi allora esegue i tick a
33/50 ms alternati su uno schermo a 60 Hz: gli avatar avanzano a passi
irregolari e l'animazione della camminata viene campionata in modo
irregolare. Il default ora è `0` (la frequenza dello schermo); impostalo
esplicitamente se il tuo config è precedente:

```json
"system.fps.max": 0
```

Lato server una stanza esegue un tick ogni 500 ms e un avatar avanza di una
casella per tick (due con `:fastwalk`), che il client interpola in 500 ms.

### Custom badges `401 Unauthorized`

È normale se non sei loggato o se apri Octane da un host diverso.

Usa:

```txt
http://localhost:5173
```

e API:

```txt
http://localhost:2096
```

## 8. Differenza con produzione

Locale con `yarn start`:

```html
<script type="module" src="/src/bootstrap.ts"></script>
```

Produzione buildata:

```html
<script src="/configuration/bootstrap.js"></script>
```

Non mischiare i due flow.
