import { IHousekeepingList } from './IHousekeepingTypes';

export interface HousekeepingStatPoint {
    /** Unix seconds at the start of the bucket. */
    bucket: number;
    value: number;
}

export const HOUSEKEEPING_STATS_LIST = 'hotel.stats';
export const HOUSEKEEPING_HOUR = 3600;
export const HOUSEKEEPING_DAY = 86400;

/**
 * One series of the hotel.stats list as a gapless run of `count` buckets of `step` seconds
 * ending with the one that holds `now`. The server leaves empty buckets out; they read 0 here,
 * so a quiet hour shows as an empty bar rather than disappearing from the axis.
 */
export const readHousekeepingStatSeries = (
    list: IHousekeepingList | null,
    series: string,
    step: number,
    count: number,
    now: number
): HousekeepingStatPoint[] => {
    const values = new Map<number, number>();

    if (list) {
        const seriesIndex = list.columns.indexOf('series');
        const bucketIndex = list.columns.indexOf('bucket');
        const valueIndex = list.columns.indexOf('value');

        for (const row of list.rows) {
            if (row[seriesIndex] !== series) continue;

            const bucket = Number(row[bucketIndex]);
            const value = Number(row[valueIndex]);

            if (Number.isFinite(bucket) && Number.isFinite(value)) values.set(bucket, value);
        }
    }

    const last = Math.floor(now / step) * step;

    return Array.from({ length: count }, (_, index) => {
        const bucket = last - (count - 1 - index) * step;

        return { bucket, value: values.get(bucket) ?? 0 };
    });
};
