import { describe, expect, it } from 'vitest';
import { buildErrorReport } from './ErrorReport';

const decode = (encoded: string) => new TextDecoder().decode(Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)));
const time = new Date('2026-01-02T03:04:05.000Z');

describe('error report', () => {
    it('packs the time, user, hotel and error into one block', () => {
        const report = buildErrorReport({ message: 'It broke', userId: 7, hotel: 'hotel.example', time }, false);

        expect(report.message).toBe('It broke');
        expect(decode(report.encoded)).toBe('time: 2026-01-02T03:04:05.000Z\nuser: 7\nhotel: hotel.example\nerror: It broke');
    });

    it('adds the stack only when asked to', () => {
        const input = { message: 'Café is closed', stack: 'at open (shop.ts:1)', time };

        expect(decode(buildErrorReport(input, false).encoded)).not.toContain('stack:');
        expect(decode(buildErrorReport(input, true).encoded)).toContain('error: Café is closed\nstack:\nat open (shop.ts:1)');
    });

    it('names an error without a message', () => {
        expect(buildErrorReport({ message: '', time }, false).message).toBe('Unknown error');
    });
});
