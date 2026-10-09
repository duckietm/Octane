import { describe, expect, it } from 'vitest';
import { resolveHabboPageUrl } from './resolveHabboPageUrl';

const LOCATION = 'https://hotel.example/client/';

describe('resolveHabboPageUrl', () => {
    it('resolves a page inside the folder', () => {
        expect(resolveHabboPageUrl('/gamedata/habbopages/', 'help/rules', LOCATION)).toBe('https://hotel.example/gamedata/habbopages/help/rules');
        expect(resolveHabboPageUrl('https://cdn.example/pages/', 'faq', LOCATION)).toBe('https://cdn.example/pages/faq');
    });

    it('rejects paths that leave the folder', () => {
        expect(resolveHabboPageUrl('/gamedata/habbopages/', '../../api/user', LOCATION)).toBeNull();
        expect(resolveHabboPageUrl('/gamedata/habbopages/', '%2e%2e/%2e%2e/api/user', LOCATION)).toBeNull();
        expect(resolveHabboPageUrl('/gamedata/habbopages/', 'a/..%2F..%2Fapi', LOCATION)).toBeNull();
        expect(resolveHabboPageUrl('/gamedata/habbopages/', '..\\api', LOCATION)).toBeNull();
    });

    it('rejects other hosts and schemes', () => {
        expect(resolveHabboPageUrl('/gamedata/habbopages/', '/evil.example/x', LOCATION)).toBeNull();
        expect(resolveHabboPageUrl('/gamedata/habbopages/', 'javascript:alert(1)', LOCATION)).toBeNull();
    });

    it('rejects bad encoding and empty input', () => {
        expect(resolveHabboPageUrl('/gamedata/habbopages/', '%E0%A4%A', LOCATION)).toBeNull();
        expect(resolveHabboPageUrl('', 'faq', LOCATION)).toBeNull();
    });
});
