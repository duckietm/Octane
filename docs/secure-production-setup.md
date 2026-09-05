# Setup Secure Runtime in produzione

Guida rapida per avviare Octane con:

- configurazioni e gamedata serviti da `/nitro-sec/file`;
- API `/api/*` cifrate dal wrapper runtime;
- bundle buildati offuscati come `.dat`.

Negli esempi usa i tuoi domini reali al posto di:

- `https://hotel.example.com`
- `https://nitro.example.com:2096`

## 1. Build Octane

Nel repo `octane`:

```bash
yarn build
```

Poi pubblica la cartella `dist` nel web server del sito, ad esempio:

```txt
C:/inetpub/wwwroot/hotel/nitro
```

La struttura pubblicata deve contenere almeno:

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

Configurazione produzione secure:

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

Significato:

- `distObfuscationEnabled: true` carica `app.js.dat` e `app.css.dat`.
- `secureAssetsEnabled: true` carica `renderer-config.json`, `ui-config.json` e gamedata da `/nitro-sec/file`.
- `secureApiEnabled: true` cifra automaticamente le chiamate `/api/*`.
- `apiBaseUrl` deve puntare all'emulatore/API.
- `plainConfigBaseUrl` e `plainGamedataBaseUrl` restano fallback quando spegni secure assets.

## 3. `configuration/renderer-config.json`

File:

```txt
octane/dist/configuration/renderer-config.json
```

Valori importanti:

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

Se non usi ancora WebSocket crypto, metti:

```json
"crypto.ws.enabled": false
```

## 4. `configuration/ui-config.json`

File:

```txt
octane/dist/configuration/ui-config.json
```

Qui puoi lasciare immagini e camera su URL statici normali:

```json
{
    "camera.url": "https://hotel.example.com/client/camera/",
    "thumbnails.url": "https://hotel.example.com/client/camera/thumbnail/%thumbnail%.png"
}
```

Le immagini non sensibili possono rimanere statiche. I JSON/gamedata invece passano dal secure endpoint.

## 5. `config.ini` dell'emulatore

Nel repo `Arcturus-Morningstar-Extended`, file usato dall'emulatore:

```txt
Emulator/config.ini
```

Esempio produzione:

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

Note:

- `nitro.secure.config.root` deve puntare alla cartella dove ci sono `renderer-config.json`, `ui-config.json`, `client-mode.json`.
- `nitro.secure.gamedata.root` deve puntare alla cartella live dei gamedata.
- I file vengono letti live da disco: se cambi un JSON, un nuovo refresh pagina legge la nuova versione.
- `nitro.secure.master_key` deve restare segreta e stabile. Non metterla nei file pubblici.

## 6. Cloudflare

Se usi Cloudflare:

1. Lascia la nuvoletta attiva sul dominio web `hotel.example.com`.
2. Per `nitro.example.com:2096`, assicurati che Cloudflare supporti/proxy il traffico sulla porta usata.
3. Usa sempre HTTPS/WSS lato browser:

```json
"api.url": "https://nitro.example.com:2096",
"socket.url": "wss://nitro.example.com:2096"
```

Se vedi errori CORS, controlla:

```ini
ws.whitelist=https://hotel.example.com
```

## 7. IIS / MIME `.dat`

Se usi gli asset offuscati `.dat`, IIS deve servirli.

Aggiungi MIME type:

```txt
Extension: .dat
MIME type: application/octet-stream
```

Senza questo, il browser può dare 404 anche se il file esiste davvero.

## 8. Checklist finale

- `client-mode.json` ha `secureAssetsEnabled=true`.
- `client-mode.json` ha `secureApiEnabled=true`.
- `renderer-config.json` usa `/nitro-sec/file?kind=gamedata&file=`.
- `api.url` punta a `https://nitro.example.com:2096`.
- `socket.url` punta a `wss://nitro.example.com:2096`.
- `config.ini` ha `nitro.secure.config.root` corretto.
- `config.ini` ha `nitro.secure.gamedata.root` corretto.
- `config.ini` ha `nitro.secure.master_key` stabile.
- IIS conosce il MIME `.dat`.
- Dopo modifiche a `config.ini`, riavvia l'emulatore.
- Dopo modifiche ai JSON in `configuration` o `gamedata`, basta refresh pagina.

## 9. Spegnere temporaneamente secure

Per debug rapido, cambia solo `client-mode.json`:

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

Poi fai hard refresh.

## 10. `configuration/bootstrap.js`

File:

```txt
octane/dist/configuration/bootstrap.js
```

Questo è il primo loader quando usi la modalità secure esterna.

Fa tre cose:

1. apre una sessione ECDH con l'emulatore tramite `/nitro-sec/bootstrap`;
2. scarica `client-mode.json` cifrato da `/nitro-sec/file?kind=config`;
3. scarica `asset-loader.js` cifrato e lo importa come modulo JavaScript.

### Valore da controllare

Dentro `bootstrap.js` esiste:

```js
const API_BASE = "https://nitro.example.com:2096";
```

Deve puntare all'emulatore/API pubblico.

In produzione:

```js
const API_BASE = "https://nitro.example.com:2096";
```

In locale:

```js
const API_BASE = "http://localhost:2096";
```

Se `bootstrap.js` fallisce, prova automaticamente fallback plain su:

```txt
configuration/asset-loader.js
```

Quindi `asset-loader.js` deve esistere sempre nella cartella `configuration`.

## 11. `configuration/asset-loader.js`

File:

```txt
octane/dist/configuration/asset-loader.js
```

Questo loader carica il bundle vero:

- se `distObfuscationEnabled=true`
  - carica `app.css.dat`;
  - carica `app.js.dat`;
  - decodifica, decomprime e importa il bundle da blob.

- se `distObfuscationEnabled=false`
  - carica `assets/app.css`;
  - carica `assets/app.js`.

### File richiesti in produzione

Con offuscamento attivo devono esistere:

```txt
assets/app.css.dat
assets/app.js.dat
configuration/asset-loader.js
configuration/bootstrap.js
configuration/client-mode.json
```

Con offuscamento spento devono esistere:

```txt
assets/app.css
assets/app.js
configuration/asset-loader.js
configuration/client-mode.json
```

## 12. `index.html`

Il file `index.html` deve rimanere minimale.

Esempio secure:

```html
<div id="root"></div>
<script src="/configuration/bootstrap.js"></script>
```

Esempio dev Vite:

```html
<div id="root"></div>
<script type="module" src="/src/bootstrap.ts"></script>
```

Non mischiare i due flow:

- produzione buildata: usa `configuration/bootstrap.js`;
- sviluppo con `yarn start`: usa `/src/bootstrap.ts`.

## 13. File dentro `/configuration`

La cartella `configuration` deve contenere:

```txt
asset-loader.js
bootstrap.js
client-mode.json
renderer-config.json
ui-config.json
adsense.json              opzionale
hotlooks.json             se usi register hot looks
UITexts.json              se usi testi UI separati
```

Le news login non devono stare in `news.json` in produzione: arrivano dal database tramite:

```json
"login.news.url": "${api.url}/api/auth/news"
```

L'emulatore legge dalla tabella `ui_news`.

Con `secureAssetsEnabled=true`, i file letti dal client passano da:

```txt
https://nitro.example.com:2096/nitro-sec/file?kind=config&file=...
```

Quindi l'emulatore li legge da:

```ini
nitro.secure.config.root=C:/inetpub/wwwroot/hotel/octane/configuration
```

Se aggiungi nuovi file JSON/JS in `configuration` e vuoi proteggerli, devono essere richiesti passando dal secure endpoint o caricati tramite `bootstrap.js`.
