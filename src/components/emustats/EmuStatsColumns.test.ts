import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The live stats page showed every online user's credits; the server no longer sends them to it.
describe('EmuStats users table', () =>
{
    it('has no credits column', () =>
    {
        const view = readFileSync(resolve(__dirname, 'EmuStatsView.tsx'), 'utf8');

        expect(view).not.toContain("key: 'credits'");
        expect(view).toContain("key: 'roomId'");
    });
});
