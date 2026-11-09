import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/habbo/HabboSkin.css'), 'utf8');
const slices = join(process.cwd(), 'src/assets/images/habbo-skin/slices');
const states = [
    ['', 'default'],
    ['-hover', 'hover'],
    ['-pressed', 'pressed'],
    ['-disabled', 'disabled']
] as const;

// AIR button style 5 / 6: the grey shiny skin multiplied by the element colour; style 4: the dark shiny skin.
const sets = [
    ...['3399cc', '54c32e', 'dda100', '0a9bc5', '4faf4f', '77bf43', '009900', '01a101', '00cc00'].map((tint) => [
        `shiny-thick-tint-${tint}`,
        `button-shiny-thick-tint-${tint}`
    ]),
    ...['b265ce', 'aaaaaa', '2095d4', '01a101', 'e33934', '7cc561'].map((tint) => [`shiny-tint-${tint}`, `button-shiny-tint-${tint}`]),
    ...['aaaaaa', '00aa00', 'aa0000'].map((tint) => [`shiny-large-tint-${tint}`, `button-shiny-large-tint-${tint}`]),
    ['shiny-black', 'button-shiny-black']
];

describe('Habbo skin tinted button slices', () => {
    it.each(sets)('defines --habbo-skin-%s for every state, backed by a slice', (variable, file) => {
        for (const [suffix, state] of states) {
            const name = `${file}-${state}.png`;
            expect(css).toContain(`--habbo-skin-${variable}${suffix}: url("../../assets/images/habbo-skin/slices/${name}");`);
            expect(existsSync(join(slices, name))).toBe(true);
        }
    });
});
