import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('catalog pet preview stacking', () => {
    it('keeps the full-size editor layer transparent so it cannot cover the pet image', () => {
        const css = readFileSync(join(process.cwd(), 'src/css/catalog/CatalogExperience.css'), 'utf8');
        const editorRule = css.match(/\.octane-catalog-pet-editor\s*\{([^}]+)\}/)?.[1] ?? '';

        expect(editorRule).toContain('background: transparent');
        expect(editorRule).not.toMatch(/background:\s*#e4e3db/);
    });
});
