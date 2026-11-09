import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('LoadingView branding', () => {
    it('centers the Octane logo and does not show the Octane V3 mark or spinning crate', () => {
        const source = readFileSync(join(process.cwd(), 'src/components/loading/LoadingView.tsx'), 'utf8');

        expect(source).toContain('octane-logo.png');
        expect(source).toContain('alt="Octane"');
        expect(source).not.toContain('octane_v3.png');
        expect(source).not.toContain('loading.gif');
        expect(source).not.toContain('alt="Octane V3"');
    });
});
