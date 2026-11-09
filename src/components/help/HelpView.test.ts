import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('HelpView', () => {
    it('keeps report steps inside a compact responsive window', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/help/HelpView.tsx'), 'utf8');

        expect(source).toContain('w-[min(448px,calc(100vw-16px))]');
        expect(source).not.toContain("${activeReport ? '' : ' w-");
    });
});
