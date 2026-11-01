import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// One refused custom badge call used to clear the access token every other HTTP feature shares.
describe('CustomBadgeApi', () => {
    it('leaves the shared access token alone on a 401', () => {
        const source = readFileSync('src/api/badges/CustomBadgeApi.ts', 'utf8');

        expect(source).not.toContain('clearAccessToken');
    });
});
