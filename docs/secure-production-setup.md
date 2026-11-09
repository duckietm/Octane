# Setup Secure Runtime in produzione

Guida rapida per avviare Octane con:

- configurazioni e gamedata serviti da `/nitro-sec/file`;
- API `/api/*` cifrate dal wrapper runtime;
- bundle buildati offuscati come `.dat`.

Negli esempi usa i tuoi domini reali al posto di:

- `https://hotel.example.com`
- `https://nitro.example.com:2096`

Scorciatoia: `node install.mjs --secure=on --emulator-config=<percorso>/config.ini` imposta i flag di
`client-mode.json` (sezione 2), genera `nitro.secure.master_key` e aggiorna `config.ini` (sezione 5, con backup).
Senza `--emulator-config` stampa le righe da incollare. Una master key già impostata non viene mai sostituita.
`nitro.secure.config.root` e `nitro.secure.gamedata.root` restano da impostare a mano.

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
- Se `/nitro-sec/bootstrap` non risponde con una chiave (secure spento sul server, emulatore vecchio, rete), il client carica config, gamedata e `/api` in chiaro invece di fallire, e riprova la via cifrata dopo 5 minuti. Con `nitro.secure.api.required=true` il server rifiuta comunque con 403 le chiamate in chiaro a `/api/auth/*` e `/api/badges/*`.
- Il client rinnova la sua chiave ogni `nitro.secure.session_ttl_sec` secondi del server (tra 60 e 3600; 300 se il server non lo indica).

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

## 14. Content-Security-Policy

Una CSP dice al browser da dove il client può caricare script, frame e connessioni: se un plugin, un annuncio o
dell'HTML iniettato prova a caricare altro, il browser lo blocca. `index.html` porta solo le regole valide per ogni
hotel (`object-src 'none'; base-uri 'self'`); la policy completa dipende dagli host dell'hotel e va negli header del
web server.

Base da adattare (sostituisci gli host d'esempio con quelli di `client-mode.json`, `renderer-config.json` e
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

- **`'unsafe-eval'`** serve oggi a PixiJS, che compila al volo le funzioni degli shader. Si potrà togliere quando il
  renderer caricherà `pixi.js/unsafe-eval`.
- **`blob:`** in `script-src` serve a `asset-loader.js`, che importa il bundle decompresso da un blob.
- **Plugin esterni**: ogni host di `external.plugins` va aggiunto a `script-src`, e conviene elencarlo anche in
  `external.plugins.allowed.hosts`.
- **Annunci**: con `ads.frame.url` (sezione 15) basta il loro origin in `frame-src`; AdSense direttamente nel client
  richiede invece i domini Google in `script-src`, `img-src`, `connect-src` e `frame-src`.
- **`frame-ancestors`**: elenca il CMS che incorpora il client, oppure lascia `'self'`.

Prima di applicarla, mettila come `Content-Security-Policy-Report-Only`: il browser segnala in console cosa avrebbe
bloccato, senza bloccarlo. Quando la console è pulita su login, hotel view, stanza, catalogo e giochi, passa a
`Content-Security-Policy`.

IIS (`web.config` nella cartella del client):

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

### Remember token in cookie

Con `"login.remember.cookie": true` in `ui-config.json` il client chiede all'emulatore di tenere il remember token in
un cookie HttpOnly su `/api/auth`, che nessuno script può leggere. Nel `config.ini` dell'emulatore:

```ini
login.remember.cookie.name=octane_remember
# Strict se client e API sono sullo stesso sito; None se sono su siti diversi (solo https)
login.remember.cookie.samesite=Strict
login.remember.cookie.secure=true
```

Un emulatore che non conosce la modalità cookie risponde con il token nel JSON e il client lo salva come prima.

## 15. Annunci su un origin separato

Lo script di AdSense, caricato nel client, gira nello stesso origin della sessione. Per tenerlo fuori:

1. pubblica `configuration/ads-frame.html.example`, rinominato `ads-frame.html`, su un altro origin
   (es. `https://ads.example.net/ads-frame.html`), con il suo `ads.txt`;
2. in `ui-config.json` imposta `"ads.frame.url": "https://ads.example.net/ads-frame.html"`.

Il client mostra allora l'annuncio in un iframe sandbox che può aprire l'inserzionista in una nuova scheda ma non
navigare il client, e passa l'unità pubblicitaria (da `ads.txt` e `adsense.json`) nella query. Senza `ads.frame.url`
l'annuncio resta nel client come prima.
