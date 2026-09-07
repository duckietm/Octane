import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
});
