import { describe, expect, it } from 'vitest';
import { HOUSEKEEPING_HOUR, readHousekeepingStatSeries } from './HousekeepingStats';

const list = (rows: string[][]) => ({ listKey: 'hotel.stats', targetId: 0, ok: true, message: '', columns: ['series', 'bucket', 'value'], rows });

describe('readHousekeepingStatSeries', () => {
    const now = 10 * HOUSEKEEPING_HOUR + 1_234;

    it('ends with the bucket that holds now and fills the gaps with 0', () => {
        const points = readHousekeepingStatSeries(
            list([
                ['activity', String(10 * HOUSEKEEPING_HOUR), '7'],
                ['activity', String(8 * HOUSEKEEPING_HOUR), '3'],
                ['bans', String(10 * HOUSEKEEPING_HOUR), '99']
            ]),
            'activity',
            HOUSEKEEPING_HOUR,
            4,
            now
        );

        expect(points).toEqual([
            { bucket: 7 * HOUSEKEEPING_HOUR, value: 0 },
            { bucket: 8 * HOUSEKEEPING_HOUR, value: 3 },
            { bucket: 9 * HOUSEKEEPING_HOUR, value: 0 },
            { bucket: 10 * HOUSEKEEPING_HOUR, value: 7 }
        ]);
    });

    it('reads an empty run without a list', () => {
        expect(readHousekeepingStatSeries(null, 'bans', HOUSEKEEPING_HOUR, 2, now).map((point) => point.value)).toEqual([0, 0]);
    });
});
