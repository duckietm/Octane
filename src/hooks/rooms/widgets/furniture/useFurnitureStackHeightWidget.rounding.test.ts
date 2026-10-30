import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('stack helper height', () => {
    it('rounds the height it sends instead of truncating it', () => {
        const source = readFileSync(join(process.cwd(), 'src/hooks/rooms/widgets/furniture/useFurnitureStackHeightWidget.ts'), 'utf8');

        expect(1.15 * 100).toBeLessThan(115);
        expect(Math.round(1.15 * 100)).toBe(115);
        expect(source).toContain('setPendingHeight(Math.round(height * 100));');
        expect(source).not.toContain('setPendingHeight(height * 100);');
    });
});
