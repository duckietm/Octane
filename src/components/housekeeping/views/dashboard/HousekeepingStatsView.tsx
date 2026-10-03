import { FC, ReactNode, useEffect, useState } from 'react';
import { FaBan, FaDoorOpen } from 'react-icons/fa';
import {
    HOUSEKEEPING_DAY,
    HOUSEKEEPING_HOUR,
    HOUSEKEEPING_STATS_LIST,
    HousekeepingApi,
    housekeepingFailureKey,
    HousekeepingStatPoint,
    IHousekeepingList,
    LocalizeText,
    readHousekeepingStatSeries
} from '../../../../api';

/** The series move by the hour; a minute keeps the current bar fresh without crowding the rate-limited list request. */
const REFRESH_MS = 60_000;

const ACTIVITY_HOURS = 24;
const BAN_DAYS = 14;

const hourLabel = (bucket: number) => new Date(bucket * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const dayLabel = (bucket: number) => new Date(bucket * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/**
 * One series as thin bars on a baseline: no grid, no legend (the title names the series), the
 * first, middle and last buckets labelled on the axis, and a readout line for the bar under
 * the pointer. A visually hidden table carries the same numbers for screen readers.
 */
const HousekeepingBarChart: FC<{
    title: string;
    icon: ReactNode;
    points: HousekeepingStatPoint[];
    label: (bucket: number) => string;
    unit: string;
}> = ({ title, icon, points, label, unit }) => {
    const [hovered, setHovered] = useState<number | null>(null);
    const max = Math.max(1, ...points.map((point) => point.value));
    const total = points.reduce((sum, point) => sum + point.value, 0);
    const shown = hovered !== null ? points[hovered] : null;
    const axis = [0, Math.floor((points.length - 1) / 2), points.length - 1];

    return (
        <figure className="m-0 flex min-w-0 flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-2">
            <figcaption className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                {icon}
                <span className="truncate">{title}</span>
            </figcaption>
            <div className="h-4 text-[11px] tabular-nums text-zinc-800">
                {shown ? (
                    <>
                        <span className="font-semibold">{shown.value}</span> {unit} · <span className="text-zinc-500">{label(shown.bucket)}</span>
                    </>
                ) : (
                    <span className="text-zinc-500">{LocalizeText('housekeeping.dashboard.chart.total', ['count'], [String(total)])}</span>
                )}
            </div>
            <div aria-hidden="true" className="flex h-20 items-end gap-[2px] border-b border-zinc-300" onMouseLeave={() => setHovered(null)}>
                {points.map((point, index) => (
                    <div key={point.bucket} className="flex h-full min-w-0 flex-1 cursor-default items-end" onMouseEnter={() => setHovered(index)}>
                        <div
                            className={`w-full rounded-t-[4px] ${hovered === index ? 'bg-sky-800' : 'bg-sky-600'}`}
                            style={{ height: point.value > 0 ? `${Math.max(4, (point.value / max) * 100)}%` : '0' }}
                        />
                    </div>
                ))}
            </div>
            <div aria-hidden="true" className="flex justify-between text-[9px] tabular-nums text-zinc-500">
                {axis.map((index) => (
                    <span key={index}>{points[index] ? label(points[index].bucket) : ''}</span>
                ))}
            </div>
            {/* The table sits in a clipped div: a <caption> is drawn outside its table box and would escape sr-only on the table itself. */}
            <div className="sr-only">
                <table>
                    <caption>{title}</caption>
                    <tbody>
                        {points.map((point) => (
                            <tr key={point.bucket}>
                                <th scope="row">{label(point.bucket)}</th>
                                <td>{point.value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </figure>
    );
};

/** Room activity per hour of the last day and bans per day of the last two weeks. */
export const HousekeepingStatsView: FC = () => {
    const [list, setList] = useState<IHousekeepingList | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = window.setInterval(() => setTick((value) => value + 1), REFRESH_MS);

        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        HousekeepingApi.requestList(HOUSEKEEPING_STATS_LIST, 0, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return;

                setList(result);
                setError(result.ok ? null : result.message || 'housekeeping.list.failed');
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(housekeepingFailureKey(reason, 'housekeeping.list.failed'));
            });

        return () => controller.abort();
    }, [tick]);

    if (error) return <div className="text-[11px] italic text-zinc-500">{LocalizeText(error)}</div>;

    const now = Math.floor(Date.now() / 1000);

    return (
        <div className="grid grid-cols-2 gap-1.5">
            <HousekeepingBarChart
                icon={<FaDoorOpen size={9} />}
                label={hourLabel}
                points={readHousekeepingStatSeries(list, 'activity', HOUSEKEEPING_HOUR, ACTIVITY_HOURS, now)}
                title={LocalizeText('housekeeping.dashboard.chart.activity')}
                unit={LocalizeText('housekeeping.dashboard.chart.activity.unit')}
            />
            <HousekeepingBarChart
                icon={<FaBan size={9} />}
                label={dayLabel}
                points={readHousekeepingStatSeries(list, 'bans', HOUSEKEEPING_DAY, BAN_DAYS, now)}
                title={LocalizeText('housekeeping.dashboard.chart.bans')}
                unit={LocalizeText('housekeeping.dashboard.chart.bans.unit')}
            />
        </div>
    );
};
