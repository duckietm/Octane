import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('HelpIndexView Habbo Way link', () => {
    it('opens only a web URL, without a handle back to the client', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/help/views/HelpIndexView.tsx'), 'utf8');

        expect(source).toContain("else if (isSafeExternalUrl(url)) window.open(url, 'habboMain', 'noopener,noreferrer');");
        expect(source).not.toContain("window.open(url, 'habboMain');");
    });
});
