import { FC, useEffect, useState } from 'react';
import { FaLock, FaLockOpen, FaShieldAlt } from 'react-icons/fa';
import { HousekeepingApi, housekeepingFailureKey, LocalizeText } from '../../../../api';
import { useHousekeeping, useHousekeepingDangerConfirm } from '../../../../hooks';
import { HousekeepingButton, HousekeepingEmptyState, HousekeepingPill, HousekeepingSection } from '../common/HousekeepingParts';

const SECURITY_LIST = 'hotel.security';
const LOCKDOWN_WORD = 'LOCKDOWN';

/**
 * The emergency lockdown: while it is on, only the highest rank can use the panel. Only that
 * rank may switch it, and the server enforces both; the others see its state.
 */
export const HousekeepingSecurityView: FC = () => {
    const { isActionPending, setLockdown } = useHousekeeping();
    const confirmDanger = useHousekeepingDangerConfirm();
    const [state, setState] = useState<{ locked: boolean; topRank: boolean } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        HousekeepingApi.requestList(SECURITY_LIST, 0, controller.signal)
            .then((list) => {
                if (controller.signal.aborted) return;

                const row = list.rows[0];

                if (!list.ok || !row) {
                    setError(list.message || 'housekeeping.list.failed');

                    return;
                }

                setError(null);
                setState({ locked: row[list.columns.indexOf('lockdown')] === '1', topRank: row[list.columns.indexOf('top_rank')] === '1' });
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(housekeepingFailureKey(reason, 'housekeeping.list.failed'));
            });

        return () => controller.abort();
    }, [reload]);

    const toggle = (enable: boolean) => {
        const run = async () => {
            const result = await setLockdown(enable);

            if (result?.ok) setReload((value) => value + 1);
        };

        if (enable) {
            confirmDanger(
                LocalizeText('housekeeping.hotel.security.lock.confirm', ['word'], [LOCKDOWN_WORD]),
                LOCKDOWN_WORD,
                run,
                LocalizeText('housekeeping.hotel.security.lock')
            );

            return;
        }

        run();
    };

    return (
        <HousekeepingSection
            aside={
                state && (
                    <HousekeepingPill tone={state.locked ? 'danger' : 'success'}>
                        {LocalizeText(state.locked ? 'housekeeping.hotel.security.state.locked' : 'housekeeping.hotel.security.state.open')}
                    </HousekeepingPill>
                )
            }
            icon={<FaShieldAlt className="text-rose-600" size={9} />}
            title={LocalizeText('housekeeping.hotel.security.label')}
            tone="danger"
        >
            <div className="text-[10px] text-zinc-600">{LocalizeText('housekeeping.hotel.security.hint')}</div>
            {error && <HousekeepingEmptyState>{LocalizeText(error)}</HousekeepingEmptyState>}
            {!error && !state && <HousekeepingEmptyState>{LocalizeText('generic.loading')}</HousekeepingEmptyState>}
            {state &&
                (state.topRank ? (
                    state.locked ? (
                        <HousekeepingButton disabled={isActionPending} gap={1} variant="success" onClick={() => toggle(false)}>
                            <FaLockOpen size={10} />
                            <span>{LocalizeText('housekeeping.hotel.security.unlock')}</span>
                        </HousekeepingButton>
                    ) : (
                        <HousekeepingButton disabled={isActionPending} gap={1} variant="danger" onClick={() => toggle(true)}>
                            <FaLock size={10} />
                            <span>{LocalizeText('housekeeping.hotel.security.lock')}</span>
                        </HousekeepingButton>
                    )
                ) : (
                    <div className="text-[10px] italic text-zinc-500">{LocalizeText('housekeeping.hotel.security.top_only')}</div>
                ))}
        </HousekeepingSection>
    );
};
