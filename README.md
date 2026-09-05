# Octane

Octane is a fork of [Nitro React](https://github.com/billsonnn/nitro-react) and its companion [Nitro Renderer](https://github.com/billsonnn/nitro-renderer) and is completely independently developed and has no further ties to Billsonnn / Nitro.


## Prerequisites

-   [Git](https://git-scm.com/)
-   [NodeJS](https://nodejs.org/) >= 18
    - If using NodeJS < 18 remove `--openssl-legacy-provider` from the package.json scripts
-   [Yarn](https://yarnpkg.com/) `npm i yarn -g`

## Quick install (recommended)

The repository ships a cross-platform installer that performs the full setup
in one go: prerequisites check, renderer clone & link, dependency install,
config copy, JSON parsing mode selection, URL prompt with validation, and the
production build.

After cloning Octane, from its root run:

```
# Windows
install.bat

# Linux / macOS
./install.sh
```

Both wrappers just exec `node install.mjs`, so you can also invoke it directly:

```
node install.mjs
```

The installer walks through these steps:

```
[1/9] Check prerequisites (node >= 18, yarn, git)
[2/9] Clone octane-renderer
[3/9] Setup renderer (yarn install + yarn link)
[4/9] Setup client (yarn install + yarn link "@octane/renderer")
[5/9] Copy public/configuration/*.example -> *.json
[6/9] Choose JSON parsing mode (jsonc recommended) -> writes .octane-build.json
[7/9] Configure URLs (interactive, validated)
[8/9] Build (yarn build)
[9/9] Summary
```

### Headless / CI runs

Every step can be driven from flags so the installer can be used in pipelines:

```
node install.mjs --non-interactive \
    --json-mode=jsonc \
    --socket-url=wss://example.com/ws \
    --api-url=https://example.com \
    --asset-url=https://example.com/nitro-assets/ \
    --image-library-url=https://example.com/c_images \
    --hof-furni-url=https://example.com/hof_furni \
    --camera-url=https://example.com/camera \
    --thumbnails-url=https://example.com/thumbnails \
    --habbopages-url=/habbopages \
    --api-base-url=https://example.com \
    --plain-config-base-url=https://example.com/configuration \
    --plain-gamedata-base-url=https://example.com/gamedata \
    --skip-link
```

Useful workflow flags:

-   `--non-interactive` / `--skip-prompts` — keep example defaults unless a URL override is passed
-   `--json-mode=<jsonc\|legacy\|auto>` — pick the parser without the JSON mode prompt
-   `--skip-build`, `--skip-clone`, `--skip-link` — re-runs without redoing those steps
-   `--help` — full flag reference and per-key URL flags

`install.mjs` is idempotent: re-running it keeps any `*.json` config files
that already exist and only patches the URL keys you pass on the CLI.

## Splitting gamedata

The renderer can load gamedata files (FigureData, FurnitureData, FigureMap,
EffectMap, ProductData, HabboAvatarActions, ExternalTexts, UITexts) either as
a single legacy JSON/JSONC file or as a **directory of small files** organised
in three tiers: `core/` (vendor baseline), `custom/` (your additions / overrides),
`seasonal/` (date-bound content such as Christmas or Easter).

The split layout is much easier to maintain — you edit a small focused file
instead of a 43 MB FurnitureData.json — and lets you keep vendor and operator
content cleanly separated.

### Directory layout

```
nitro-assets/gamedata/furnidata/
  manifest.jsonc           # { "tiers": ["core", "custom", "seasonal"] }
  core/
    manifest.jsonc         # { "files": ["floor-001.jsonc", ..., "wall-001.jsonc"] }
    floor-001.jsonc
    floor-002.jsonc
    wall-001.jsonc
  custom/                  # OPTIONAL — created by you
    manifest.jsonc         # { "files": ["my-rares.jsonc"] }
    my-rares.jsonc
  seasonal/                # OPTIONAL — created by you
    manifest.jsonc
    xmas-2026.jsonc
```

Each tier is loaded in order. Within a tier, files load in the order listed in
its `manifest.jsonc`. Items in later layers override items in earlier layers
when they share the same identifier (`id`, `classname`, `name`, or the
top-level key for flat dictionaries).

### Generating the `core/` tier from a legacy file

Use the bundled CLI splitter:

```
node scripts/split-gamedata.mjs \
    --input ~/legacy-gamedata/FurnitureData.json \
    --output ~/nitro-assets/gamedata/furnidata
```

It auto-detects the gamedata type from the file's top-level keys and applies
the strategy that makes the most sense:

| Type                 | Split strategy                              |
|----------------------|---------------------------------------------|
| EffectMap            | one file per effect `type` (dance, fx, ...) |
| FigureData           | one `palettes.jsonc` + one file per setType |
| FigureMap            | chunks of `libraries` (default 500/file)    |
| FurnitureData        | floor / wall, chunks of `furnitype` (300)   |
| HabboAvatarActions   | grouped by `state` (or single file if ≤1)   |
| ProductData          | chunks of products (default 500)            |
| ExternalTexts/UITexts| grouped by key prefix (e.g. `gamecenter.*`) |

Useful flags: `--type=<name>` to force the type, `--chunk-size=N` to override
the default chunk size, `--json` to emit standard JSON instead of JSONC,
`--force` to overwrite an existing output directory. Full reference:

```
node scripts/split-gamedata.mjs --help
```

We only ship the `core/` tier with vendor baselines — `custom/` and `seasonal/`
are operator-owned: create their manifests when you need them and the loader
picks them up automatically.

### Pointing the renderer at a directory

In `public/configuration/renderer-config.json`, replace the legacy file URL
with the directory URL (note the trailing slash — that's how the loader
detects split mode):

```jsonc
{
  // single file (legacy, still supported):
  "furnidata.url": "https://example.com/nitro-assets/gamedata/FurnitureData.json",

  // directory (split mode):
  "furnidata.url": "https://example.com/nitro-assets/gamedata/furnidata/",
}
```

Both styles work; you can migrate one gamedata file at a time.

## Installation (manual)

-   First you should open terminal and navigate to the folder where you want to clone Octane and Octane Renderer
-   Clone Octane (Expl. C:\Github\)
  -   `git clone https://github.com/duckietm/Octane.git` <== For now switch to Dev-RendererV2
	-   `git clone https://github.com/duckietm/Octane-Renderer.git`
	-   Install the dependencies for the renderer : cd C:\Github\octane-renderer
    	-   `yarn install`
	-	Now we will create a Link for the Octane Renderer : `yarn link` This will give you a link address `yarn link "@octane/renderer"`
    -   Install the dependencies for Cool UI : cd C:\Github\octane
	-   `yarn install`
 -  -   Rename a few files
    -   Copy `public/configuration/renderer-config.example` to `public/configuration/renderer-config.json`
    -   Copy `public/configuration/ui-config.example` to `public/configuration/ui-config.json`
    -   Copy `public/configuration/client-mode.example` to `public/configuration/client-mode.json`
    -   Set your links
    -   Open `public/configuration/renderer-config.json`
        -   Update `socket.url, asset.url, image.library.url, & hof.furni.url`
    -   Open `public/configuration/ui-config.json`
        -   Update `camera.url, thumbnails.url, url.prefix, habbopages.url`
	-   `yarn build` <== the final step to build the DIST folder this is where your browser needs to point / or upload this to your /client if you do the compile on a other machine (preferd)
    -   You can override any variable by passing it to `OctaneConfig` in the index.html

## JSON / JSONC configuration mode

Starting with this version of Octane, you can choose how the client parses the
configuration files (`renderer-config.json`, `ui-config.json`, `client-mode.json`,
and the gamedata JSONs served by the renderer):

-   **JSONC** (recommended) — accepts comments and trailing commas while still
    requiring double-quoted keys and strings. It is easier to maintain in `ui-config.json`
    where you may want inline notes.
-   **JSON (legacy strict)** — only valid standard JSON is accepted. Any comment
    or trailing comma will fail the load with a clear error.

### Picking a mode

The first time you run `yarn start` or `yarn build`, an interactive prompt asks
which mode to use:

```
════════════════════════════════════════════════════════════
  Octane — JSON mode configuration
════════════════════════════════════════════════════════════

  1) JSONC  (recommended)
  2) JSON   (legacy strict)
  auto      Try strict JSON first, then JSONC

Choice [1=JSONC]:
```

Your choice is stored in `.octane-build.json` at the project root (gitignored, so
each deployment keeps its own setting). Subsequent builds reuse it silently.

### Changing the mode later

Run the prompt again at any time:

```
yarn configure
```

You can also set the mode without interaction (useful in CI / scripts):

```
# one-shot override for a single build
NITRO_JSON_MODE=legacy yarn build
NITRO_JSON_MODE=jsonc  yarn build

# write the choice persistently
echo '{"jsonMode":"legacy"}' > .octane-build.json
```

The recognized values are `legacy`, `jsonc`, and `auto` (auto = try strict JSON
first, fall back to JSONC — equivalent to the original Render V3 behaviour).

### How it propagates

The chosen mode is injected at build time as the compile-time constant
`__OCTANE_JSON_MODE__`. It is honoured by:

-   `src/bootstrap.ts` when loading `client-mode.json`
-   `@octane/utils` → `JsonParser.ts` in Render V3, used for every config file
    and every gamedata JSON loaded by the renderer

In `legacy` mode, an invalid file produces a clear error that suggests switching
to JSONC; nothing is silently coerced.

## Usage

-   To use Octane you need `.nitro` assets generated, see [octane-converter](https://git.krews.org/octane/octane-converter) for instructions
-   See [Morningstar Websockets](https://git.krews.org/octane/ms-websockets) for instructions on configuring websockets on your server

### Development

Run Octane in development mode when you are editing the files, this way you can see the changes in your browser instantly

```
yarn start
```

### Production

To build a production version of Octane just run the following command

```
yarn build:prod
```

-   A `dist` folder will be generated, these are the files that must be uploaded to your webserver
-   Consult your CMS documentation for compatibility with Octane and how to add the production files
