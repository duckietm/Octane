# Custom themes (graphics-only)

Ecosistema temi caricati a **runtime** (niente rebuild del client). Un tema =
una cartella con un manifest + "pezzi" CSS. Ogni pezzo è attivabile/disattivabile
dall'utente da **Impostazioni → Temi** (checkbox). Se un pezzo è rotto/404 →
fallback automatico al default (solo quel pezzo).

## Dove vivono
- **Questa cartella (`custom-themes/`) è solo il TEMPLATE di riferimento**, versionata su git.
- I temi **veri** stanno sul server in `public/octane/custom-themes/` (serviti via
  l'url configurato in ui-config `theme.base.url`, es. `/client/octane/custom-themes`).
  NON vanno su git → vedi `.gitignore` (`public/custom-themes/`).

## Struttura
```
custom-themes/
  index.json                 # { "themes": [ { "id", "name", "author?" } ] }
  <id>/
    theme.json               # { "name", "pieces": [ { "id", "name", "file" } ] }
    cards.css  chat.css  ...  # un file per "pezzo"
    assets/...               # immagini referenziate dai CSS (url assoluti)
```

## Creare un tema
1. Copia `neon-viola/` in una nuova cartella `<id>/`.
2. Modifica `theme.json` (nome + elenco pezzi).
3. Scrivi i CSS dei pezzi (override con `!important`, caricati dopo il base).
4. Aggiungi `{ "id": "<id>", "name": "..." }` a `index.json`.
5. Carica la cartella in `public/octane/custom-themes/` sul server. **Nessun rebuild.**

## Default hotel-wide (admin)
In `ui-config.json`:
- `theme.base.url`  → dove sono serviti i temi
- `theme.default`   → id del tema attivo di default (vuoto = nessuno)
- `theme.default.pieces` → array di id pezzi attivi di default

Ogni utente può comunque sovrascrivere da Impostazioni → Temi (salvato in localStorage).

> Nota: i temi ri-skinnano solo la **grafica** (CSS). Non cambiano la struttura
> dei componenti né il comportamento.
