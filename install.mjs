#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { DEFAULT_JSON_MODE, normalizeJsonModeAnswer, VALID_JSON_MODES } from './scripts/json-mode.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RENDERER_REPO_URL = 'https://github.com/duckietm/Octane-Renderer.git';
// Sibling folder names the client's vite.config / tsconfig already know how to resolve.
// Auto-detection walks these in order; a fresh clone defaults to the first one.
const RENDERER_DIR_CANDIDATES = ['Octane-Renderer', 'renderer'];
const DEFAULT_RENDERER_DIR_NAME = RENDERER_DIR_CANDIDATES[0];
// Resolved in main() from --renderer-repo / --renderer-dir / OCTANE_RENDERER_DIR / auto-detection.
let RENDERER_REPO_URL = DEFAULT_RENDERER_REPO_URL;
let RENDERER_DIR = resolve(ROOT, '..', DEFAULT_RENDERER_DIR_NAME);
const CONFIG_DIR = join(ROOT, 'public', 'configuration');
const OCTANE_BUILD_FILE = join(ROOT, '.octane-build.json');
const IS_WINDOWS = platform() === 'win32';
const MIN_NODE_MAJOR = 18;

const KEY_SPECS = {
    'socket.url':           { type: 'url',       schemes: ['ws:', 'wss:'],     flag: 'socket-url' },
    'api.url':              { type: 'url',       schemes: ['http:', 'https:'], flag: 'api-url' },
    'asset.url':            { type: 'url',       schemes: ['http:', 'https:'], flag: 'asset-url' },
    'image.library.url':    { type: 'url',       schemes: ['http:', 'https:'], flag: 'image-library-url' },
    'hof.furni.url':        { type: 'url',       schemes: ['http:', 'https:'], flag: 'hof-furni-url' },
    'camera.url':           { type: 'url',       schemes: ['http:', 'https:'], flag: 'camera-url' },
    'thumbnails.url':       { type: 'url',       schemes: ['http:', 'https:'], flag: 'thumbnails-url' },
    'url.prefix':           { type: 'pathOrUrl', schemes: ['http:', 'https:'], flag: 'url-prefix' },
    'habbopages.url':       { type: 'pathOrUrl', schemes: ['http:', 'https:'], flag: 'habbopages-url' },
    'apiBaseUrl':           { type: 'url',       schemes: ['http:', 'https:'], flag: 'api-base-url' },
    'plainConfigBaseUrl':   { type: 'url',       schemes: ['http:', 'https:'], flag: 'plain-config-base-url' },
    'plainGamedataBaseUrl': { type: 'url',       schemes: ['http:', 'https:'], flag: 'plain-gamedata-base-url' }
};

const FLAG_TO_KEY = Object.fromEntries(
    Object.entries(KEY_SPECS).map(([key, spec]) => [spec.flag, key])
);

const CONFIG_FILES = [
    {
        example: 'renderer-config.example',
        target: 'renderer-config.json',
        keys: ['socket.url', 'api.url', 'asset.url', 'image.library.url', 'hof.furni.url']
    },
    {
        example: 'ui-config.example',
        target: 'ui-config.json',
        keys: ['camera.url', 'thumbnails.url', 'url.prefix', 'habbopages.url']
    },
    {
        example: 'client-mode.example',
        target: 'client-mode.json',
        keys: ['apiBaseUrl', 'plainConfigBaseUrl', 'plainGamedataBaseUrl']
    }
];

const STEPS = [
    'Check prerequisites',
    'Resolve / clone renderer',
    'Setup renderer (yarn install + yarn link)',
    'Setup client (yarn install + yarn link)',
    'Copy config files',
    'Choose JSON parsing mode',
    'Configure URLs',
    'Build (yarn build)',
    'Summary'
];

let currentStep = 0;
let activeReadline = null;
const summary = {
    rendererCloned: false,
    rendererSkipped: false,
    configsCreated: [],
    configsKept: [],
    configsPatched: [],
    jsonMode: null,
    jsonModeSource: null,
    buildRan: false,
    buildSkipped: false
};

const useColor = !process.env.NO_COLOR && process.stdout.isTTY;
const c = {
    reset:  useColor ? '\x1b[0m'  : '',
    bold:   useColor ? '\x1b[1m'  : '',
    dim:    useColor ? '\x1b[2m'  : '',
    red:    useColor ? '\x1b[31m' : '',
    green:  useColor ? '\x1b[32m' : '',
    yellow: useColor ? '\x1b[33m' : '',
    cyan:   useColor ? '\x1b[36m' : ''
};

function info(msg) { console.log(c.cyan   + '[i]' + c.reset + ' ' + msg); }
function ok(msg)   { console.log(c.green  + '[+]' + c.reset + ' ' + msg); }
function warn(msg) { console.log(c.yellow + '[!]' + c.reset + ' ' + msg); }
function err(msg)  { console.error(c.red  + '[x]' + c.reset + ' ' + msg); }

function step(label) {
    currentStep += 1;
    const sep = '----------------------------------------------------------------';
    console.log('');
    console.log(c.dim + sep + c.reset);
    console.log(c.bold + '[' + currentStep + '/' + STEPS.length + '] ' + label + c.reset);
    console.log(c.dim + sep + c.reset);
}

function runShell(cmdString, cwd) {
    return new Promise((resolveFn, rejectFn) => {
        const child = spawn(cmdString, { shell: true, cwd, stdio: 'inherit' });
        child.on('error', e => rejectFn(new Error("'" + cmdString + "' (cwd: " + cwd + ") failed to start: " + e.message)));
        child.on('exit', code => {
            if (code === 0) resolveFn();
            else rejectFn(new Error("'" + cmdString + "' (cwd: " + cwd + ") exited with code " + code));
        });
    });
}

function runCapture(cmdString) {
    return new Promise((resolveFn, rejectFn) => {
        const child = spawn(cmdString, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', d => { stdout += d.toString(); });
        child.stderr.on('data', d => { stderr += d.toString(); });
        child.on('error', e => rejectFn(new Error("'" + cmdString + "' failed to start: " + e.message)));
        child.on('exit', code => {
            if (code === 0) resolveFn(stdout.trim());
            else rejectFn(new Error("'" + cmdString + "' exited with code " + code + (stderr ? ': ' + stderr.trim() : '')));
        });
    });
}

function validateValue(value, spec) {
    if (value === '' || value === undefined || value === null) {
        if (spec.type === 'pathOrUrl') return { valid: true };
        return { valid: false, error: 'value cannot be empty' };
    }
    if (spec.type === 'pathOrUrl' && value.startsWith('/')) {
        return { valid: true };
    }
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        return { valid: false, error: 'not a valid URL' };
    }
    if (spec.schemes.length > 0 && !spec.schemes.includes(parsed.protocol)) {
        const allowed = spec.schemes.map(s => s.replace(':', '')).join(', ');
        return { valid: false, error: 'scheme must be one of: ' + allowed };
    }
    return { valid: true };
}

function parseArgs() {
    const opts = {
        interactive: true,
        skipBuild: false,
        skipClone: false,
        skipLink: false,
        help: false,
        jsonMode: null,
        rendererDir: null,
        rendererRepo: null,
        urlOverrides: {}
    };
    const builtinFlags = new Set([
        '--non-interactive', '--skip-prompts',
        '--skip-build', '--skip-clone', '--skip-link',
        '--help', '-h'
    ]);
    for (const arg of process.argv.slice(2)) {
        if (builtinFlags.has(arg)) {
            switch (arg) {
                case '--non-interactive':
                case '--skip-prompts': opts.interactive = false; break;
                case '--skip-build':   opts.skipBuild = true; break;
                case '--skip-clone':   opts.skipClone = true; break;
                case '--skip-link':    opts.skipLink = true; break;
                case '--help':
                case '-h':             opts.help = true; break;
            }
            continue;
        }
        const eq = arg.indexOf('=');
        if (arg.startsWith('--') && eq > 2) {
            const flagName = arg.slice(2, eq);
            const value = arg.slice(eq + 1);
            if (flagName === 'json-mode') {
                if (!VALID_JSON_MODES.includes(value)) {
                    warn('Invalid --json-mode=' + value + ' (expected: ' + VALID_JSON_MODES.join(', ') + '), ignored');
                    continue;
                }
                opts.jsonMode = value;
                continue;
            }
            if (flagName === 'renderer-dir') {
                if (value.length === 0) { warn('Empty --renderer-dir ignored'); continue; }
                opts.rendererDir = value;
                continue;
            }
            if (flagName === 'renderer-repo') {
                if (value.length === 0) { warn('Empty --renderer-repo ignored'); continue; }
                opts.rendererRepo = value;
                continue;
            }
            const key = FLAG_TO_KEY[flagName];
            if (key) {
                opts.urlOverrides[key] = value;
                continue;
            }
        }
        warn('Unknown flag: ' + arg + ' (ignored)');
    }
    return opts;
}

function printUsage() {
    const flagList = Object.entries(KEY_SPECS)
        .map(([key, spec]) => '  --' + spec.flag + '=<value>' + ' '.repeat(Math.max(1, 32 - spec.flag.length)) + 'Set ' + key)
        .join('\n');
    console.log([
        'Octane cross-platform installer',
        '',
        'Usage: node install.mjs [flags]',
        '',
        'Workflow flags:',
        '  --non-interactive, --skip-prompts   Keep default URLs unless overridden by --<key>=<value>',
        '  --json-mode=<jsonc|legacy|auto>     Choose the JSON parsing mode without prompting',
        '  --renderer-dir=<path>               Renderer folder (absolute, or relative to the parent dir).',
        '                                      Default: auto-detect ' + RENDERER_DIR_CANDIDATES.join(' / ') + ', else "' + DEFAULT_RENDERER_DIR_NAME + '". Env: OCTANE_RENDERER_DIR',
        '  --renderer-repo=<url>               Git URL to clone the renderer from (default: duckietm/Octane-Renderer)',
        '  --skip-build                        Skip the final yarn build',
        '  --skip-clone                        Skip cloning the renderer',
        '  --skip-link                         Skip yarn link calls (useful when re-running)',
        '  --help, -h                          Show this help and exit',
        '',
        'URL override flags (override interactive prompts; combine with --non-interactive for fully automated runs):',
        flagList,
        '',
        'Steps performed:',
        '  1. Check Node >= ' + MIN_NODE_MAJOR + ', yarn, git',
        '  2. Resolve the renderer dir (--renderer-dir / OCTANE_RENDERER_DIR / interactive prompt / auto-detect ' + RENDERER_DIR_CANDIDATES.join(' or ') + '), cloning to ../' + DEFAULT_RENDERER_DIR_NAME + ' if absent',
        '  3. yarn install + yarn link in the renderer',
        '  4. yarn install + yarn link "@octane/renderer" in this project',
        '  5. Copy public/configuration/*.example -> *.json (keeps existing files)',
        '  6. Choose JSON parsing mode (jsonc recommended) -> writes .octane-build.json',
        '  7. Prompt for URLs and patch the JSON config files',
        '  8. yarn build (honours the JSON mode chosen at step 6)',
        ''
    ].join('\n'));
}

async function checkPrereqs() {
    const nodeVer = process.versions.node;
    const major = parseInt(nodeVer.split('.')[0], 10);
    if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
        throw new Error('Node >= ' + MIN_NODE_MAJOR + ' required (you have v' + nodeVer + '). Install from https://nodejs.org/');
    }
    ok('Node v' + nodeVer);

    try {
        const v = await runCapture('yarn --version');
        ok('yarn ' + v);
    } catch {
        const hint = IS_WINDOWS ? 'npm i -g yarn' : 'sudo npm i -g yarn';
        throw new Error('yarn not found on PATH. Install with: ' + hint);
    }

    try {
        const v = await runCapture('git --version');
        ok(v);
    } catch {
        const hint = IS_WINDOWS ? 'winget install Git.Git' : 'sudo apt-get install git  (or your distro equivalent)';
        throw new Error('git not found on PATH. Install with: ' + hint);
    }
}

// Resolve which sibling folder is the renderer SDK, honouring (in priority order):
//   1. --renderer-dir=<path>      2. OCTANE_RENDERER_DIR env   (both skip the prompt)
//   3. interactive prompt — the operator chooses (default = a detected folder, else ./octane-renderer)
//   4. --non-interactive: first existing folder among RENDERER_DIR_CANDIDATES, else ./octane-renderer
// A chosen/explicit path may be absolute or relative to the parent of the client.
async function resolveRendererDir(opts) {
    const parent = resolve(ROOT, '..');
    const toAbs = p => (isAbsolute(p) ? resolve(p) : resolve(parent, p));

    if (opts.rendererDir) {
        const dir = toAbs(opts.rendererDir);
        info('Renderer dir from --renderer-dir: ' + dir);
        return dir;
    }
    // NITRO_RENDERER_DIR is the legacy env name, kept for existing setups
    const rendererDirEnv = process.env.OCTANE_RENDERER_DIR ?? process.env.NITRO_RENDERER_DIR;
    if (rendererDirEnv) {
        const dir = toAbs(rendererDirEnv);
        info('Renderer dir from OCTANE_RENDERER_DIR: ' + dir);
        return dir;
    }

    let detected = null;
    for (const name of RENDERER_DIR_CANDIDATES) {
        const candidate = resolve(parent, name);
        if (existsSync(candidate)) { detected = candidate; break; }
    }
    const suggested = detected || resolve(parent, DEFAULT_RENDERER_DIR_NAME);

    if (!opts.interactive) {
        info(detected ? 'Using detected renderer: ' + detected : 'Renderer will be cloned to: ' + suggested);
        return suggested;
    }

    if (detected) info('Found an existing renderer at ' + detected + ' (press Enter to reuse it).');
    info('Choose where the renderer SDK lives — a folder name (relative to ' + parent + ') or an absolute path.');
    const rl = readline.createInterface({ input, output });
    activeReadline = rl;
    try {
        const answer = (await rl.question('  Renderer folder [' + suggested + ']: ')).trim();
        return answer.length === 0 ? suggested : toAbs(answer);
    } finally {
        activeReadline = null;
        rl.close();
    }
}

async function cloneRenderer(opts) {
    RENDERER_DIR = await resolveRendererDir(opts);
    ok('Renderer dir: ' + RENDERER_DIR);
    if (!RENDERER_DIR_CANDIDATES.includes(basename(RENDERER_DIR))) {
        warn('Custom renderer folder "' + basename(RENDERER_DIR) + '": vite.config resolves it via path alias, but ui/tsconfig.json only lists [' + RENDERER_DIR_CANDIDATES.join(', ') + ']. Add this path under "paths" there so tsc/IDE type-resolution works.');
    }
    if (opts.skipClone) { info('--skip-clone: not cloning the renderer'); summary.rendererSkipped = true; return; }
    if (existsSync(RENDERER_DIR)) {
        warn('Renderer already present at ' + RENDERER_DIR + ' - skipping clone (yarn install/link will still run).');
        summary.rendererSkipped = true;
        return;
    }
    await runShell('git clone ' + RENDERER_REPO_URL + ' "' + RENDERER_DIR + '"', dirname(RENDERER_DIR));
    summary.rendererCloned = true;
    ok('Cloned renderer to ' + RENDERER_DIR);
}

async function setupRenderer(opts) {
    if (!existsSync(RENDERER_DIR)) {
        throw new Error('Renderer directory not found: ' + RENDERER_DIR + '. Re-run without --skip-clone or clone it manually.');
    }
    await runShell('yarn install', RENDERER_DIR);
    if (opts.skipLink) { info('--skip-link: skipping yarn link in renderer'); return; }
    try {
        await runShell('yarn link', RENDERER_DIR);
    } catch (e) {
        warn('yarn link in renderer failed (likely already linked): ' + e.message);
    }
}

async function setupClient(opts) {
    await runShell('yarn install', ROOT);
    if (opts.skipLink) { info('--skip-link: skipping yarn link in client'); return; }
    try {
        await runShell('yarn link "@octane/renderer"', ROOT);
    } catch (e) {
        warn('yarn link "@octane/renderer" failed (likely already linked): ' + e.message);
    }
}

async function writeJsonMode(mode) {
    const payload = { jsonMode: mode, configuredAt: new Date().toISOString() };
    await writeFile(OCTANE_BUILD_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

async function chooseJsonMode(opts) {
    if (opts.jsonMode) {
        await writeJsonMode(opts.jsonMode);
        summary.jsonMode = opts.jsonMode;
        summary.jsonModeSource = 'CLI (--json-mode)';
        ok('JSON mode set to ' + opts.jsonMode + ' (from --json-mode)');
        return;
    }

    let existing = null;
    if (existsSync(OCTANE_BUILD_FILE)) {
        try {
            const raw = await readFile(OCTANE_BUILD_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (VALID_JSON_MODES.includes(parsed?.jsonMode)) existing = parsed.jsonMode;
        } catch {}
    }

    if (!opts.interactive) {
        const mode = existing || DEFAULT_JSON_MODE;
        await writeJsonMode(mode);
        summary.jsonMode = mode;
        summary.jsonModeSource = existing ? 'existing .octane-build.json' : 'default (non-interactive)';
        info('--non-interactive: JSON mode = ' + mode + (existing ? ' (preserved)' : ' (default)'));
        return;
    }

    info('Pick how configuration files (renderer-config, ui-config, gamedata) are parsed.');
    info('  1) JSONC  (recommended - accepts comments and trailing commas)');
    info('  2) JSON   (legacy strict - only standard JSON valid)');
    info('  auto      Try strict JSON first, then JSONC');
    if (existing) info('  Current value in .octane-build.json: ' + existing);

    const rl = readline.createInterface({ input, output });
    activeReadline = rl;
    let chosen = null;
    try {
        while (chosen === null) {
            const defaultLabel = existing || '1=JSONC';
            const answer = (await rl.question('  Choice [' + defaultLabel + ']: ')).trim().toLowerCase();
            chosen = answer.length === 0
                ? (existing || DEFAULT_JSON_MODE)
                : normalizeJsonModeAnswer(answer);

            if(chosen === null) warn('Invalid choice. Enter 1, 2, jsonc, json, legacy, or auto.');
        }
    } finally {
        activeReadline = null;
        rl.close();
    }

    await writeJsonMode(chosen);
    summary.jsonMode = chosen;
    summary.jsonModeSource = 'interactive prompt';
    ok('JSON mode set to ' + chosen + ' -> wrote .octane-build.json');
    if (chosen === 'legacy') {
        warn('Legacy mode is strict: config files must be valid standard JSON (no comments, no trailing commas).');
    }
}

async function copyConfigs() {
    for (const entry of CONFIG_FILES) {
        const src = join(CONFIG_DIR, entry.example);
        const dst = join(CONFIG_DIR, entry.target);
        if (!existsSync(src)) {
            throw new Error('Missing example file: ' + src);
        }
        if (existsSync(dst)) {
            warn(entry.target + ' already exists - keeping existing file (URL overrides will still patch it).');
            summary.configsKept.push(entry.target);
        } else {
            await copyFile(src, dst);
            ok('Created ' + entry.target);
            summary.configsCreated.push(entry.target);
        }
    }
}

async function applyOverridesNonInteractive(opts) {
    for (const entry of CONFIG_FILES) {
        const dst = join(CONFIG_DIR, entry.target);
        const raw = await readFile(dst, 'utf8');
        let obj;
        try {
            obj = JSON.parse(raw);
        } catch (e) {
            throw new Error('Could not parse ' + entry.target + ' as JSON: ' + e.message);
        }
        let changed = false;
        for (const key of entry.keys) {
            if (Object.prototype.hasOwnProperty.call(opts.urlOverrides, key)) {
                const value = opts.urlOverrides[key];
                const result = validateValue(value, KEY_SPECS[key]);
                if (!result.valid) {
                    throw new Error('Invalid value for --' + KEY_SPECS[key].flag + '=' + JSON.stringify(value) + ': ' + result.error);
                }
                if (obj[key] !== value) {
                    obj[key] = value;
                    changed = true;
                }
            }
        }
        if (changed) {
            await writeFile(dst, JSON.stringify(obj, null, 4) + '\n');
            ok('Updated ' + entry.target + ' (from CLI flags)');
            summary.configsPatched.push(entry.target);
        }
    }
}

async function promptConfigs(opts) {
    const overrideKeys = Object.keys(opts.urlOverrides);
    if (!opts.interactive) {
        if (overrideKeys.length > 0) {
            info('--non-interactive with ' + overrideKeys.length + ' URL override(s); applying without prompts');
            await applyOverridesNonInteractive(opts);
        } else {
            info('--non-interactive: keeping URL values from .example defaults');
        }
        return;
    }
    info('Press Enter to keep the current value shown in [brackets]. URLs are validated.');
    if (overrideKeys.length > 0) {
        info('CLI overrides take precedence and skip prompts: ' + overrideKeys.map(k => '--' + KEY_SPECS[k].flag).join(', '));
    }
    const rl = readline.createInterface({ input, output });
    activeReadline = rl;
    try {
        for (const entry of CONFIG_FILES) {
            const dst = join(CONFIG_DIR, entry.target);
            const raw = await readFile(dst, 'utf8');
            let obj;
            try {
                obj = JSON.parse(raw);
            } catch (e) {
                throw new Error('Could not parse ' + entry.target + ' as JSON: ' + e.message);
            }
            console.log('\n  ' + c.bold + entry.target + c.reset);
            let changed = false;
            for (const key of entry.keys) {
                const spec = KEY_SPECS[key];
                if (Object.prototype.hasOwnProperty.call(opts.urlOverrides, key)) {
                    const value = opts.urlOverrides[key];
                    const result = validateValue(value, spec);
                    if (!result.valid) {
                        throw new Error('Invalid value for --' + spec.flag + '=' + JSON.stringify(value) + ': ' + result.error);
                    }
                    if (obj[key] !== value) { obj[key] = value; changed = true; }
                    console.log('    ' + c.dim + key + ' = ' + value + '  (from --' + spec.flag + ')' + c.reset);
                    continue;
                }
                const current = obj[key] === undefined ? '' : String(obj[key]);
                while (true) {
                    const answer = await rl.question('    ' + key + ' [' + current + ']: ');
                    const trimmed = answer.trim();
                    if (trimmed.length === 0) break;
                    if (trimmed === current) break;
                    const result = validateValue(trimmed, spec);
                    if (!result.valid) {
                        warn('Invalid: ' + result.error + '. Try again or press Enter to keep current.');
                        continue;
                    }
                    obj[key] = trimmed;
                    changed = true;
                    break;
                }
            }
            if (changed) {
                await writeFile(dst, JSON.stringify(obj, null, 4) + '\n');
                ok('Updated ' + entry.target);
                summary.configsPatched.push(entry.target);
            } else {
                info('No changes to ' + entry.target);
            }
        }
    } finally {
        activeReadline = null;
        rl.close();
    }
}

async function runBuild(opts) {
    if (opts.skipBuild) { info('--skip-build: skipping yarn build'); summary.buildSkipped = true; return; }
    await runShell('yarn build', ROOT);
    summary.buildRan = true;
}

function printSummary() {
    const distPath = join(ROOT, 'dist');
    console.log('');
    console.log(c.bold + '================================================================' + c.reset);
    console.log(c.bold + ' Installation summary' + c.reset);
    console.log(c.bold + '================================================================' + c.reset);
    console.log(' Renderer:   ' + RENDERER_DIR + (summary.rendererCloned ? '  (cloned)' : '  (already present)'));
    if (summary.configsCreated.length) console.log(' Created:    ' + summary.configsCreated.join(', '));
    if (summary.configsKept.length)    console.log(' Kept:       ' + summary.configsKept.join(', '));
    if (summary.configsPatched.length) console.log(' Patched:    ' + summary.configsPatched.join(', '));
    if (summary.jsonMode)              console.log(' JSON mode:  ' + summary.jsonMode + (summary.jsonModeSource ? '  (' + summary.jsonModeSource + ')' : ''));
    if (summary.buildRan)              console.log(' Build:      ' + c.green + 'OK' + c.reset + ' -> ' + distPath);
    else if (summary.buildSkipped)     console.log(' Build:      skipped');
    console.log('');
    console.log(' Next steps:');
    console.log('   - Development:  yarn start');
    if (summary.buildRan) {
        console.log('   - Production:   deploy the contents of ' + distPath + ' to your webserver');
    } else {
        console.log('   - Production:   yarn build, then deploy ' + distPath);
    }
    console.log(c.bold + '================================================================' + c.reset);
}

async function main() {
    const opts = parseArgs();
    if (opts.help) { printUsage(); process.exit(0); }

    RENDERER_REPO_URL = opts.rendererRepo || DEFAULT_RENDERER_REPO_URL;

    console.log(c.bold + 'Octane installer' + c.reset + ' (' + (IS_WINDOWS ? 'Windows' : platform()) + ')');
    console.log('Project root: ' + ROOT);

    step(STEPS[0]); await checkPrereqs();
    step(STEPS[1]); await cloneRenderer(opts);
    step(STEPS[2]); await setupRenderer(opts);
    step(STEPS[3]); await setupClient(opts);
    step(STEPS[4]); await copyConfigs();
    step(STEPS[5]); await chooseJsonMode(opts);
    step(STEPS[6]); await promptConfigs(opts);
    step(STEPS[7]); await runBuild(opts);
    step(STEPS[8]); printSummary();
}

process.on('SIGINT', () => {
    if (activeReadline) {
        try { activeReadline.close(); } catch {}
        activeReadline = null;
    }
    const label = STEPS[currentStep - 1] || 'startup';
    console.error('');
    warn('Aborted at step ' + currentStep + ' (' + label + ')');
    process.exit(130);
});

main().catch(e => {
    const label = STEPS[currentStep - 1] || 'startup';
    err('');
    err('Step ' + currentStep + ' (' + label + ') failed:');
    err('    ' + e.message);
    process.exit(1);
});
