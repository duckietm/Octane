#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { DEFAULT_JSON_MODE, isValidJsonMode, normalizeJsonModeAnswer } from './json-mode.mjs';
const SCRIPT_DIR = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');
const CONFIG_FILE = resolve(PROJECT_ROOT, '.octane-build.json');
const args = process.argv.slice(2);
const ifMissing = args.includes('--if-missing');
const nonInteractive = args.includes('--non-interactive') || !process.stdin.isTTY;
const readExisting = () =>
{
    if(!existsSync(CONFIG_FILE)) return null;
    try
    {
        const raw = readFileSync(CONFIG_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        if(parsed && isValidJsonMode(parsed.jsonMode)) return parsed;
    }
    catch {}
    return null;
};
const writeChoice = (mode) =>
{
    const payload = {
        jsonMode: mode,
        configuredAt: new Date().toISOString()
    };
    writeFileSync(CONFIG_FILE, `${ JSON.stringify(payload, null, 2) }\n`, 'utf8');
};
const printBanner = () =>
{
    const line = '═'.repeat(60);
    process.stdout.write(`\n${ line }\n  Octane V3 — JSON mode configuration\n${ line }\n\n`);
    process.stdout.write('Configuration files (renderer-config, ui-config, gamedata)\ncan be parsed in two ways:\n\n');
    process.stdout.write('  1) JSONC  (recommended — accepts comments and trailing commas)\n');
    process.stdout.write('  2) JSON   (legacy strict — only standard valid JSON)\n');
    process.stdout.write('  auto      Try strict JSON first, then JSONC\n\n');
};
const promptUser = () => new Promise(resolveFn =>
{
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = () =>
    {
        rl.question('Choice [1=JSONC]: ', answer =>
        {
            const normalized = normalizeJsonModeAnswer(answer);
            if(normalized === null)
            {
                process.stdout.write('  ↳ Invalid response. Please enter 1, 2, jsonc, json, or auto.\n');
                return ask();
            }
            rl.close();
            resolveFn(normalized);
        });
    };
    ask();
});
const main = async () =>
{
    const existing = readExisting();
    if(ifMissing && existing)
    {
        process.stdout.write(`[configure-json] mode already configured: ${ existing.jsonMode } (skip)\n`);
        return;
    }
    if(nonInteractive)
    {
        const mode = existing?.jsonMode || DEFAULT_JSON_MODE;
        writeChoice(mode);
        process.stdout.write(`[configure-json] non-interactive — saved: ${ mode }\n`);
        return;
    }
    printBanner();
    if(existing) process.stdout.write(`Current mode: ${ existing.jsonMode }\n\n`);
    const choice = await promptUser();
    writeChoice(choice);
    process.stdout.write(`\n✓ Saved to .octane-build.json — mode: ${ choice }\n`);
    if(choice === 'legacy')
    {
        process.stdout.write('  Warning: config files must be strict valid JSON\n  (no comments, no trailing commas).\n');
    }
    else
    {
        process.stdout.write('  JSONC active: you can use comments and trailing commas\n  in configuration files. Keys and strings still require double quotes.\n');
    }
    process.stdout.write('\n  To change mode in the future: yarn configure\n\n');
};
main().catch(err =>
{
    process.stderr.write(`[configure-json] error: ${ err?.message || err }\n`);
    process.exit(1);
});
