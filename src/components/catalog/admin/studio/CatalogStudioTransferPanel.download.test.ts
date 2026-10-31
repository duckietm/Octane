import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('CatalogStudioTransferPanel download', () => {
    it('revokes the file URL after the browser had time to start the download', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/catalog/admin/studio/CatalogStudioTransferPanel.tsx'), 'utf8');

        expect(source).toContain('window.setTimeout(() => URL.revokeObjectURL(url), 1000);');
        expect(source).not.toMatch(/link\.click\(\);\s*URL\.revokeObjectURL\(url\);/);
    });
});
