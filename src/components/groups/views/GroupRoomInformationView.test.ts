import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { transformSync } from '@babel/core';
import { describe, expect, it } from 'vitest';

describe('GroupRoomInformationView', () => {
    it('sizes the HUD box from CSS and keeps it right-aligned in the HUD column', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/groups/views/GroupRoomInformationView.tsx'), 'utf8');
        const css = readFileSync(join(process.cwd(), 'src/css/groups/GroupView.css'), 'utf8');

        // The SWF restyle moved sizing out of Tailwind classes and into GroupView.css.
        expect(source).toContain('octane-group-room-info');
        expect(source).not.toMatch(/max-w-\[\d+px\]/);

        // Right-aligned in the same HUD column as the purse (which sits at 230px);
        // the group box is deliberately narrower at 188px.
        expect(css).toMatch(/\.octane-group-room-info\s*\{[^}]*margin-left:\s*auto;/s);
        expect(css).toMatch(/\.octane-group-room-info\s*\{[^}]*max-width:\s*188px;/s);
    });

    it('leaves before the React Compiler reads the group fields, so a room without a group renders nothing', () => {
        const file = 'src/components/groups/views/GroupRoomInformationView.tsx';
        const source = readFileSync(join(process.cwd(), file), 'utf8');
        // Compiled as vite.config.mjs does: the compiler caches the button handlers on groupInformation's fields
        // and reads them where they are created, so the null check has to come first.
        const compiled =
            transformSync(source, {
                filename: file,
                babelrc: false,
                configFile: false,
                parserOpts: { plugins: ['jsx', 'typescript'] },
                plugins: [['babel-plugin-react-compiler', { target: '19' }]]
            })?.code ?? '';

        const guard = compiled.indexOf('if (!groupInformation)');
        // The compiler's cache checks read the fields unguarded: `$[n] !== groupInformation.membershipType`.
        const firstFieldRead = compiled.search(/\$\[\d+\] !== groupInformation\./);

        expect(compiled).toContain('_c(');
        expect(guard).toBeGreaterThan(-1);
        expect(firstFieldRead).toBeGreaterThan(-1);
        expect(guard).toBeLessThan(firstFieldRead);
    });
});
