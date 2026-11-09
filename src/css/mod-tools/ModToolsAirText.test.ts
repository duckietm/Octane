import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(join(process.cwd(), 'src/css/mod-tools/NativeLayout.css'), 'utf8');

describe('mod tools text (start_panel additions)', () => {
    it('sets the find-user row in the regular Ubuntu, not the condensed `Ubuntu` face', () => {
        expect(css).toMatch(/\.native-start-panel__search input \{[^}]*font: 400 11px\/18px HabboAirUbuntu, UbuntuRegular/);
        expect(css).toMatch(/\.native-start-panel__clear \{[^}]*HabboAirUbuntu, UbuntuRegular/);
        expect(css).not.toMatch(/\bfont:[^;]*\bUbuntu, sans-serif/);
    });
});
