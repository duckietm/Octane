<div align="center">

# Octane

**A modern browser client for Habbo retro hotels, built with React 19, TypeScript and PixiJS 8.**

[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](LICENSE)
![React 19](https://img.shields.io/badge/React-19-61dafb.svg)
![Vite 8](https://img.shields.io/badge/Vite-8-646cff.svg)
![Node 22.12+](https://img.shields.io/badge/node-%E2%89%A5%2022.12-339933.svg)
[![Discord](https://img.shields.io/badge/Discord-join%20us-5865F2.svg)](https://discord.gg/aJ46cd3F9g)

[Octane](https://github.com/duckietm/Octane) ·
[Octane Renderer](https://github.com/duckietm/Octane-Renderer) ·
[Polaris Emulator](https://github.com/duckietm/Polaris-Emulator) ·
[Confurter](https://github.com/duckietm/all-in-1-converter) ·
[Discord](https://discord.gg/aJ46cd3F9g)

</div>

---

Octane is the user interface of the hotel: navigator, catalog, inventory, chat, Wired Creator Tools and everything
else you click on. The rooms, avatars and furniture are drawn by its companion, the
[Octane Renderer](https://github.com/duckietm/Octane-Renderer). It talks to the
[Polaris Emulator](https://github.com/duckietm/Polaris-Emulator) over WebSockets.

Octane started as a fork of [Nitro React](https://github.com/billsonnn/nitro-react) and
[Nitro Renderer](https://github.com/billsonnn/nitro-renderer). It is developed independently and has no ties to
Billsonnn / Nitro.

## ✨ Highlights

- **React 19 + Vite 8 + TypeScript**, with Zustand, TanStack Query and Vitest
- **Habbo's `.hab` asset bundles** as well as `.nitro`: furniture, clothes and pets, including Habbo's own `.hab` files as downloaded
- **JSON or JSONC configuration**: comments and trailing commas allowed when you want them
- **Split gamedata**: FurnitureData, FigureData and friends as many small files in `core/`, `custom/` and `seasonal/` tiers
- **UI texts in 7 languages**: English, Dutch, German, French, Spanish, Italian and Arabic
- **One-command installer** for a fresh setup, with a headless mode for CI

## 📋 Requirements

| Tool | Version |
|---|---|
| [Git](https://git-scm.com/) | any recent version |
| [Node.js](https://nodejs.org/) | 22.12 or newer |
| [Yarn](https://yarnpkg.com/) | 4 (run `corepack enable` once; the version is pinned in `package.json`) |

You also need a running [Polaris Emulator](https://github.com/duckietm/Polaris-Emulator) and your game assets
(`.nitro` / `.hab` bundles and gamedata), which you can make with the
[Confurter](https://github.com/duckietm/all-in-1-converter).

## 🚀 Quick install (recommended)

Clone Octane and run the installer from its root:

```bash
git clone https://github.com/duckietm/Octane.git
cd Octane

# Windows
install.bat

# Linux / macOS
./install.sh
```

Both wrappers run `node install.mjs`, which you can also call directly. The installer:

1. Checks Node, Yarn and Git
2. Clones the renderer next to Octane (`../Octane-Renderer`) when it is not there yet
3. Installs the renderer's dependencies
4. Installs Octane's dependencies
5. Copies `public/configuration/config.example.jsonc` to `config.jsonc`, the `config.example/` folder to `config/` and `client-mode.example.json` to `client-mode.json` (existing files are kept; a hotel still on `renderer-config.json` + `ui-config.json` has them moved into `config/` first, as `yarn config:split` does)
6. Asks for the JSON parsing mode (JSONC recommended) and saves it in `.octane-build.json`
7. Asks for your URLs and validates them, then writes `socket.url`, `api.url`, `url.prefix`, `asset.url`, `image.library.url`, `thumbnails.url` and `habbopages.url` in `config/server.jsonc` and `camera.url` in `config/features.jsonc`
8. Asks whether to encrypt config, gamedata and `/api` (secure mode), sets the two flags in `client-mode.json`, and either patches the emulator's `config.ini` (backup first) or prints the lines to paste, with a freshly generated `nitro.secure.master_key`
9. Builds the client
10. Prints a summary

Re-running it is safe: existing config files are kept and only the URL keys you pass are patched. A `nitro.secure.master_key` that is already set in `config.ini` is never replaced.

<details>
<summary><b>Headless / CI install</b></summary>

Every step can be driven from flags:

```bash
node install.mjs --non-interactive \
    --json-mode=jsonc \
    --socket-url=wss://example.com/ws \
    --api-url=https://example.com \
    --asset-url=https://example.com/gamedata \
    --image-library-url=https://example.com/c_images \
    --camera-url=https://example.com/camera \
    --thumbnails-url=https://example.com/thumbnails \
    --habbopages-url=/habbopages \
    --api-base-url=https://example.com \
    --plain-config-base-url=https://example.com/configuration \
    --plain-gamedata-base-url=https://example.com/gamedata
```

- `--non-interactive` / `--skip-prompts`: keep the example defaults unless a URL flag is passed
- `--json-mode=<jsonc|legacy|auto>`: pick the parser without the prompt
- `--secure=<on|off>`, `--secure-api=<on|off>`: secure mode without the prompt; without `--secure` a non-interactive run leaves it as it is
- `--emulator-config=<path to config.ini>`: patch the emulator config instead of printing the values
- `--skip-build`, `--skip-clone`, `--skip-link`: skip those steps on a re-run
- `--help`: every flag, including one per URL key

</details>

## 🛠️ Manual install

Octane finds the renderer as a **sibling folder**, so clone both repositories into the same parent folder:

```bash
git clone https://github.com/duckietm/Octane-Renderer.git
git clone https://github.com/duckietm/Octane.git

cd Octane-Renderer && yarn install
cd ../Octane && yarn install
```

```
your-folder/
├── Octane/
└── Octane-Renderer/
```

Then copy the configuration examples (see below), set your URLs and build with `yarn build`.

## ⚙️ Configuration

All runtime configuration lives in `public/configuration/`. Copy `config.example.jsonc` to `config.jsonc`, the
`config.example/` folder to `config/`, and `client-mode.example.json` to `client-mode.json` (the installer does these); copy any other `<name>.example.json(c)` you need to `<name>.json(c)` by hand:

| File | What to set |
|---|---|
| `config.jsonc` | `config.files`: the files below to load, in order; a key in a later file wins over the same key in an earlier one |
| `config/server.jsonc` | Server and connection (`socket.url`, `api.url`, `url.prefix`, `hotel.name`), Assets and game data (`asset.url`, `image.library.url`, `gamedata.url`, `thumbnails.url`, `habbopages.url`, `external.texts.url`, `furnidata.url` and the other asset URLs), Login and account (`login.*`, `account.*` endpoints), Loading screen (`loading.*`), Logging and performance (`system.log.*`, `system.fps.max`) |
| `config/hotel.jsonc` | Avatar; Rooms, furni and navigator; Catalog, purse and currencies; Chat and mentions; Friends and groups; Quests, games, talents and help; and last, "Keys this client does not read" |
| `config/features.jsonc` | Features on and off; Wired; Radio and soundboard; Camera (`camera.url`); Staff tools |
| `config/data.jsonc` | the long tables: chat styles, camera effects, notification styles, room models, default figure data, recolorable palettes |
| `client-mode.json` | `apiBaseUrl`, `plainConfigBaseUrl`, `plainGamedataBaseUrl` |
| `UITexts_<lang>.jsonc` | the interface texts per language |

`config.jsonc` and `config/` are git-ignored. Each file opens with a one-line comment on what it holds, each section with a
`// ==== Title ====` heading and a line on its purpose, and every key has a `//` comment above it, so the files need the
`jsonc` or `auto` mode below: `legacy` cannot read them. To find where a key lives, search `config.example/` for it.

A hotel still on the old `renderer-config.json` + `ui-config.json` keeps working: when `config.jsonc` is missing,
unreadable or lists nothing usable, the client loads those two files as before. Three commands help with the move:

| Command | What it does |
|---|---|
| `yarn config:split` | Moves the old `renderer-config.json` + `ui-config.json` into `config.jsonc` + `config/`, keeping the hotel's values and only the keys the hotel set (the rest keeps the client's own value, `config.example/` shows it); writes the four files above, and keys no code reads go to the last section of `config/hotel.jsonc` ("Keys this client does not read"); the old files are left untouched |
| `yarn config:sync [--check]` | Reports, never writes: files `config.jsonc` lists that are missing (`--check` exits 1), install addresses not set, keys set to the value the client uses anyway (they can go), keys no code reads, and how many keys keep the client's own value |
| `yarn config:examples` | Regenerates `config.example*` from `configuration-keys.json`, the one list of keys: edit that file, never the examples by hand |
| `client-mode.json` | `apiBaseUrl`, `plainConfigBaseUrl`, `plainGamedataBaseUrl` |
| `UITexts_<lang>.jsonc` | the interface texts per language |

### 📦 Asset bundles: `.nitro` and `.hab`

Habbo's own client now loads every asset as a `.hab` bundle. Octane loads **both** `.hab` and `.nitro`. Which one is
used is decided by the extension in each asset URL:

```jsonc
"furni.asset.url":  "${asset.url}/hab/%libname%.hab",
"avatar.asset.url": "${asset.url}/clothes/%libname%.hab",
"pet.asset.url":    "${asset.url}/pets/%libname%.hab"
```

- Habbo's `.hab` furniture, clothes and pets work as downloaded
- A URL only loads its own extension: convert custom furni, custom pets and `landscape` before switching
  (the Confurter's **Nitro … to HAB** tools do that)
- Keep Octane's own `landscape` bundle: Habbo's `landscape.hab` is only the catalogue item
- Your web server must send CORS headers for `.hab` just like for `.nitro`

### 🧾 JSON or JSONC

Octane can read the configuration and gamedata files in two ways:

| Mode | Behaviour |
|---|---|
| `jsonc` (recommended) | Comments and trailing commas are allowed; keys and strings still need double quotes |
| `legacy` | Strict JSON only; a comment or trailing comma stops the load with a clear error |
| `auto` | Strict JSON first, JSONC as a fallback |

The first `yarn start` or `yarn build` asks which mode to use and stores it in `.octane-build.json` (git-ignored, so
every deployment keeps its own choice). Change it later with `yarn configure`, or for one build only:

```bash
OCTANE_JSON_MODE=legacy yarn build
```

The choice is compiled in as `__OCTANE_JSON_MODE__` and used for every config and gamedata file the renderer loads.

### 🗂️ Split gamedata

Instead of one large file (FurnitureData.json can be tens of MB), gamedata can be a **folder of small files** in three
tiers:

```
gamedata/furnidata/
├── manifest.jsonc        { "tiers": ["core", "custom", "seasonal"] }
├── core/                 vendor baseline
│   ├── manifest.jsonc    { "files": ["floor-001.jsonc", "wall-001.jsonc"] }
│   ├── floor-001.jsonc
│   └── wall-001.jsonc
├── custom/               your additions and overrides (optional)
└── seasonal/             date-bound content such as Christmas (optional)
```

Tiers load in order and later files override earlier ones that share an `id`, `classname` or `name`. Point the
config at the folder; the trailing slash switches on split mode:

```jsonc
"furnidata.url": "https://example.com/gamedata/furnidata/"
```

Create the `core/` tier from an existing file with the bundled splitter:

```bash
node scripts/split-gamedata.mjs --input ./FurnitureData.json --output ./gamedata/furnidata
```

It detects the gamedata type (FurnitureData, FigureData, FigureMap, EffectMap, ProductData, HabboAvatarActions,
ExternalTexts / UITexts) and picks a sensible split. Run it with `--help` for all options. You can migrate one gamedata
file at a time; single files keep working.

## 💻 Development

| Goal | Command |
|---|---|
| Dev server with hot reload | `yarn start` |
| Production build (`dist/`) | `yarn build` |
| Production build with fresh browser data | `yarn build:prod` |
| Preview the production build | `yarn preview` |
| Type-check | `yarn typecheck` |
| Lint | `yarn lint` (Biome) |
| Hook-order lint | `yarn lint:hooks` |
| Tests | `yarn test` |

During development, game assets are served from a sibling `Nitro-Files/` folder (`/nitro-assets` and `/swf`), so you
do not need to copy them into `public/`.

## 🌐 Production

Run `yarn build` and upload the contents of `dist/` to your web server, or point your CMS at it. Check your CMS
documentation for how it embeds the client.

## 🤝 Related projects

| Project | What it does |
|---|---|
| [Octane Renderer](https://github.com/duckietm/Octane-Renderer) | Draws rooms, avatars and furniture (PixiJS 8) and handles the WebSocket protocol |
| [Polaris Emulator](https://github.com/duckietm/Polaris-Emulator) | The game server |
| [Confurter](https://github.com/duckietm/all-in-1-converter) | Downloads Habbo's assets and converts SWF / Nitro / HAB bundles |

Questions, bugs or ideas? Join us on [Discord](https://discord.gg/aJ46cd3F9g).

## 📄 License

Octane is licensed under the [GNU General Public License v3.0](LICENSE).
