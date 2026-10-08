import { FC, ReactNode, useState } from 'react';
import { FaBook, FaCheck, FaCog, FaCompass, FaCube, FaFilter, FaLanguage, FaSync, FaTimes, FaUserShield } from 'react-icons/fa';
import { formatHousekeepingDateTime, HOUSEKEEPING_RELOAD_TARGETS, HousekeepingReloadTarget, LocalizeText } from '../../../../api';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { HousekeepingButton, HousekeepingSection } from '../common/HousekeepingParts';

const RELOAD_ICONS: Record<HousekeepingReloadTarget, ReactNode> = {
    catalog: <FaBook className="text-sky-600" size={11} />,
    texts: <FaLanguage className="text-violet-600" size={11} />,
    permissions: <FaUserShield className="text-rose-600" size={11} />,
    items: <FaCube className="text-amber-600" size={11} />,
    navigator: <FaCompass className="text-emerald-600" size={11} />,
    config: <FaCog className="text-zinc-600" size={11} />,
    wordfilter: <FaFilter className="text-orange-600" size={11} />
};

type ReloadOutcome = { at: number; ok: boolean };

/** The server drops a reload that comes within 2s of the previous one without answering it. */
const RELOAD_SPACING_MS = 2_100;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Hot reload of the server tables, one at a time or all in a row with a report. */
export const HousekeepingReloadView: FC = () => {
    const { isActionPending, reloadHotel } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const [outcomes, setOutcomes] = useState<Partial<Record<HousekeepingReloadTarget, ReloadOutcome>>>({});
    const [isReloadingAll, setIsReloadingAll] = useState(false);

    const run = async (target: HousekeepingReloadTarget) => {
        const result = await reloadHotel(target);

        setOutcomes((previous) => ({ ...previous, [target]: { at: Date.now(), ok: !!result?.ok } }));
    };

    const reload = (target: HousekeepingReloadTarget) =>
        confirm(LocalizeText('housekeeping.hotel.reload.confirm', ['target'], [LocalizeText(`housekeeping.hotel.reload.${target}`)]), () => run(target));

    // One after the other, each waiting for its answer and starting at least RELOAD_SPACING_MS
    // after the previous one, so the server's rate limit never drops one.
    const reloadAll = () =>
        confirm(LocalizeText('housekeeping.hotel.reload.all.confirm'), async () => {
            setIsReloadingAll(true);
            setOutcomes({});

            try {
                let lastStart = 0;

                for (const target of HOUSEKEEPING_RELOAD_TARGETS) {
                    const sinceLast = Date.now() - lastStart;

                    if (lastStart && sinceLast < RELOAD_SPACING_MS) await wait(RELOAD_SPACING_MS - sinceLast);

                    lastStart = Date.now();
                    await run(target);
                }
            } finally {
                setIsReloadingAll(false);
            }
        });

    const finished = HOUSEKEEPING_RELOAD_TARGETS.filter((target) => outcomes[target]);
    const failed = finished.filter((target) => !outcomes[target]?.ok);

    return (
        <HousekeepingSection
            aside={
                <HousekeepingButton disabled={isActionPending || isReloadingAll} gap={1} size="sm" variant="primary" onClick={reloadAll}>
                    <FaSync className={isReloadingAll ? 'animate-spin' : ''} size={9} />
                    <span>{LocalizeText('housekeeping.hotel.reload.all')}</span>
                </HousekeepingButton>
            }
            icon={<FaSync className="text-sky-600" size={9} />}
            title={LocalizeText('housekeeping.hotel.reload.label')}
            tone="accent"
        >
            <div className="text-[10px] text-zinc-500">{LocalizeText('housekeeping.hotel.reload.hint')}</div>
            {finished.length === HOUSEKEEPING_RELOAD_TARGETS.length && !isReloadingAll && (
                <div
                    className={`rounded border px-2 py-1 text-[11px] ${failed.length ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}
                >
                    {failed.length
                        ? LocalizeText(
                              'housekeeping.hotel.reload.all.partial',
                              ['failed'],
                              [failed.map((target) => LocalizeText(`housekeeping.hotel.reload.${target}`)).join(', ')]
                          )
                        : LocalizeText('housekeeping.hotel.reload.all.done')}
                </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
                {HOUSEKEEPING_RELOAD_TARGETS.map((target) => {
                    const outcome = outcomes[target];

                    return (
                        <div key={target} className="flex min-w-0 items-center gap-1.5 rounded border border-zinc-200 bg-white px-1.5 py-1">
                            <span className="shrink-0">{RELOAD_ICONS[target]}</span>
                            <div className="flex min-w-0 grow flex-col">
                                <span className="truncate text-[11px] font-semibold text-zinc-800">{LocalizeText(`housekeeping.hotel.reload.${target}`)}</span>
                                <span
                                    className={`flex items-center gap-1 truncate text-[9px] ${outcome && !outcome.ok ? 'text-rose-600' : 'text-zinc-500'}`}
                                    title={LocalizeText(`housekeeping.hotel.reload.${target}.hint`)}
                                >
                                    {outcome &&
                                        (outcome.ok ? <FaCheck className="shrink-0 text-emerald-600" size={8} /> : <FaTimes className="shrink-0" size={8} />)}
                                    {outcome
                                        ? LocalizeText(
                                              outcome.ok ? 'housekeeping.hotel.reload.done_at' : 'housekeeping.hotel.reload.failed_at',
                                              ['time'],
                                              [formatHousekeepingDateTime(outcome.at)]
                                          )
                                        : LocalizeText(`housekeeping.hotel.reload.${target}.hint`)}
                                </span>
                            </div>
                            <HousekeepingButton disabled={isActionPending || isReloadingAll} gap={1} size="sm" variant="primary" onClick={() => reload(target)}>
                                <FaSync size={9} />
                                <span>{LocalizeText('housekeeping.hotel.reload.run')}</span>
                            </HousekeepingButton>
                        </div>
                    );
                })}
            </div>
        </HousekeepingSection>
    );
};
