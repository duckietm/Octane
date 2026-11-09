import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../api', () => ({ CreateLinkEvent: vi.fn(), localizeWithFallback: (_key: string, fallback: string) => fallback, LocalizeText: (key: string) => key }));
vi.mock('../../../common', () => ({}));
vi.mock('../../../hooks', () => ({ useHelp: () => ({}) }));

const { formatServerDate } = await import('./SanctionStatusView');

describe('formatServerDate', () => {
    it('turns the date text of the server into a date of the viewer, and leaves any other text alone', () => {
        const formatted = formatServerDate('Fri Oct 09 21:30:58 CEST 2026');

        expect(formatted).not.toContain('CEST');
        expect(formatted).toContain('2026');
        expect(formatServerDate('tomorrow')).toBe('tomorrow');
        expect(formatServerDate(undefined as never)).toBeUndefined();
    });
});
