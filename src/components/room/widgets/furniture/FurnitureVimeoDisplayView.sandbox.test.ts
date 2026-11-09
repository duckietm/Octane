import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('FurnitureVimeoDisplayView frame', () => {
    it('sandboxes the player so it can play but not navigate the client away', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/room/widgets/furniture/FurnitureVimeoDisplayView.tsx'), 'utf8');
        const sandbox = source.match(/sandbox="([^"]*)"/);

        expect(sandbox).not.toBeNull();
        expect(sandbox?.[1]).toContain('allow-scripts');
        expect(sandbox?.[1]).not.toContain('allow-top-navigation');
    });
});
