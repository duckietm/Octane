import { HousekeepingMaintenanceStatusEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaBan, FaHourglassHalf, FaPlay, FaPowerOff, FaTools } from 'react-icons/fa';
import {
    formatHousekeepingCountdown,
    HOUSEKEEPING_MAINTENANCE_MAX_MINUTES,
    HOUSEKEEPING_MAINTENANCE_MESSAGE_MAX,
    HOUSEKEEPING_MAINTENANCE_PRESETS,
    HousekeepingApi,
    housekeepingFailureKey,
    IHousekeepingMaintenanceStatus,
    LocalizeText,
    readMaintenanceStatus
} from '../../../../api';
import { useHousekeeping, useHousekeepingConfirm, useHousekeepingDangerConfirm, useMessageEvent } from '../../../../hooks';
import {
    HOUSEKEEPING_INPUT_CLASS,
    HousekeepingButton,
    HousekeepingEmptyState,
    HousekeepingField,
    HousekeepingNumberField,
    HousekeepingPill,
    HousekeepingSection
} from '../common/HousekeepingParts';

const DANGER_WORD = 'MAINTENANCE';

/**
 * Maintenance with a countdown: online users are told the hotel closes in N minutes and
 * reminded as it runs down; at the end everyone below the maintenance rank is disconnected.
 * "Now" skips the countdown. Every change comes back as the current state.
 */
export const HousekeepingMaintenanceView: FC = () => {
    const { isActionPending, startMaintenance, cancelMaintenance, disableMaintenance } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const confirmDanger = useHousekeepingDangerConfirm();
    const [status, setStatus] = useState<IHousekeepingMaintenanceStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [minutes, setMinutes] = useState(5);
    const [message, setMessage] = useState('');
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

    useEffect(() => {
        const controller = new AbortController();

        HousekeepingApi.getMaintenanceStatus(controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) setStatus(result);
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(housekeepingFailureKey(reason, 'housekeeping.hotel.maintenance.failed'));
            });

        return () => controller.abort();
    }, []);

    // Every change the server makes (ours or another operator's) comes back as the state.
    useMessageEvent<HousekeepingMaintenanceStatusEvent>(HousekeepingMaintenanceStatusEvent, (event) => {
        setStatus(readMaintenanceStatus(event.getParser()));
        setError(null);
    });

    const countdownEndsAt = status?.countdownEndsAt ?? 0;

    useEffect(() => {
        if (!countdownEndsAt) return;

        const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);

        return () => window.clearInterval(timer);
    }, [countdownEndsAt]);

    const trimmedMessage = message.trim();
    const validMinutes = minutes >= 1 && minutes <= HOUSEKEEPING_MAINTENANCE_MAX_MINUTES;

    const start = () =>
        confirm(LocalizeText('housekeeping.hotel.maintenance.start.confirm', ['minutes'], [String(minutes)]), () => startMaintenance(minutes, trimmedMessage));

    const startNow = () =>
        confirmDanger(
            LocalizeText('housekeeping.hotel.maintenance.now.confirm', ['word'], [DANGER_WORD]),
            DANGER_WORD,
            () => startMaintenance(0, trimmedMessage),
            LocalizeText('housekeeping.hotel.maintenance.now')
        );

    const disable = () => confirm(LocalizeText('housekeeping.hotel.maintenance.disable.confirm'), () => disableMaintenance());

    return (
        <HousekeepingSection
            aside={
                status && (
                    <HousekeepingPill tone={status.enabled ? 'danger' : countdownEndsAt ? 'warning' : 'success'}>
                        {LocalizeText(
                            status.enabled
                                ? 'housekeeping.hotel.maintenance.state.on'
                                : countdownEndsAt
                                  ? 'housekeeping.hotel.maintenance.state.countdown'
                                  : 'housekeeping.hotel.maintenance.state.off'
                        )}
                    </HousekeepingPill>
                )
            }
            icon={<FaTools className="text-amber-600" size={9} />}
            title={LocalizeText('housekeeping.hotel.maintenance.label')}
            tone="warning"
        >
            {error && <HousekeepingEmptyState>{LocalizeText(error)}</HousekeepingEmptyState>}
            {!error && !status && <HousekeepingEmptyState>{LocalizeText('generic.loading')}</HousekeepingEmptyState>}

            {status && (
                <>
                    <div className="text-[10px] text-zinc-600">{LocalizeText('housekeeping.hotel.maintenance.rank', ['rank'], [String(status.minRank)])}</div>
                    {status.message && <div className="rounded border border-zinc-200 bg-white p-1.5 text-[11px] italic text-zinc-700">{status.message}</div>}

                    {countdownEndsAt > 0 && (
                        <div className="flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-1.5">
                            <FaHourglassHalf className="text-amber-600" size={12} />
                            <div className="flex grow flex-col">
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                                    {LocalizeText('housekeeping.hotel.maintenance.closes_in')}
                                </span>
                                <span className="text-lg font-bold tabular-nums text-amber-900">{formatHousekeepingCountdown(countdownEndsAt - now)}</span>
                            </div>
                            <HousekeepingButton disabled={isActionPending} gap={1} size="sm" variant="secondary" onClick={() => cancelMaintenance()}>
                                <FaBan size={9} />
                                <span>{LocalizeText('housekeeping.hotel.maintenance.cancel')}</span>
                            </HousekeepingButton>
                        </div>
                    )}

                    {status.enabled ? (
                        <HousekeepingButton disabled={isActionPending} gap={1} variant="success" onClick={disable}>
                            <FaPowerOff size={10} />
                            <span>{LocalizeText('housekeeping.hotel.maintenance.disable')}</span>
                        </HousekeepingButton>
                    ) : (
                        <>
                            <HousekeepingField
                                hint={`${trimmedMessage.length}/${HOUSEKEEPING_MAINTENANCE_MESSAGE_MAX}`}
                                label={LocalizeText('housekeeping.hotel.maintenance.message')}
                            >
                                <input
                                    className={HOUSEKEEPING_INPUT_CLASS}
                                    maxLength={HOUSEKEEPING_MAINTENANCE_MESSAGE_MAX}
                                    placeholder={LocalizeText('housekeeping.hotel.maintenance.message.placeholder')}
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                />
                            </HousekeepingField>
                            <div className="flex flex-wrap items-center gap-1">
                                {HOUSEKEEPING_MAINTENANCE_PRESETS.map((preset) => (
                                    <HousekeepingButton
                                        key={preset}
                                        size="sm"
                                        variant={preset === minutes ? 'primary' : 'neutral'}
                                        onClick={() => setMinutes(preset)}
                                    >
                                        <span>{LocalizeText('housekeeping.hotel.maintenance.minutes', ['minutes'], [String(preset)])}</span>
                                    </HousekeepingButton>
                                ))}
                                <HousekeepingNumberField
                                    max={HOUSEKEEPING_MAINTENANCE_MAX_MINUTES}
                                    unit={LocalizeText('housekeeping.unit.minutes')}
                                    value={minutes}
                                    widthClass="w-14"
                                    onChange={setMinutes}
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <HousekeepingButton disabled={isActionPending || !validMinutes} gap={1} variant="warning" onClick={start}>
                                    <FaPlay size={9} />
                                    <span>
                                        {LocalizeText(
                                            countdownEndsAt ? 'housekeeping.hotel.maintenance.restart' : 'housekeeping.hotel.maintenance.start',
                                            ['minutes'],
                                            [String(minutes)]
                                        )}
                                    </span>
                                </HousekeepingButton>
                                <HousekeepingButton classNames={['ml-auto']} disabled={isActionPending} gap={1} variant="danger" onClick={startNow}>
                                    <FaPowerOff size={9} />
                                    <span>{LocalizeText('housekeeping.hotel.maintenance.now')}</span>
                                </HousekeepingButton>
                            </div>
                            <div className="text-[10px] text-zinc-500">
                                {LocalizeText('housekeeping.hotel.maintenance.hint', ['rank'], [String(status.minRank)])}
                            </div>
                        </>
                    )}
                </>
            )}
        </HousekeepingSection>
    );
};
