import { IssueMessageData } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FaGavel } from 'react-icons/fa';
import {
    getHousekeepingEscalationSteps,
    getHousekeepingSanctionTemplates,
    HousekeepingApi,
    HousekeepingSanctionTemplate,
    HousekeepingSanctionType,
    LocalizeText,
    localizeSanctionTemplate,
    suggestHousekeepingSanction
} from '../../../../api';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { HousekeepingButton, HousekeepingPill } from '../common/HousekeepingParts';

/**
 * The sanction the escalation suggests for the reported user, from how many sanctions they
 * already have, with a one-click apply after a confirm. The reason names the ticket. The
 * history loads on request: the list request is rate-limited, and several tickets asking at
 * once would lose all but the first.
 */
export const HousekeepingTicketEscalationView: FC<{ ticket: IssueMessageData }> = ({ ticket }) => {
    const { isActionPending, banUser, muteUser, kickUser, tradeLockUser } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const templates = useMemo(() => getHousekeepingSanctionTemplates(), []);
    const steps = useMemo(() => getHousekeepingEscalationSteps(), []);
    const [pastSanctions, setPastSanctions] = useState<number | null>(null);
    const [requested, setRequested] = useState(false);
    const [failed, setFailed] = useState(false);
    const [applied, setApplied] = useState(false);

    useEffect(() => {
        if (!requested) return;

        const controller = new AbortController();

        setFailed(false);

        HousekeepingApi.requestList('user.sanctions', ticket.reportedUserId, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return;
                if (result.ok) setPastSanctions(result.rows.length);
                else setFailed(true);
            })
            .catch(() => {
                if (!controller.signal.aborted) setFailed(true);
            })
            .finally(() => {
                if (!controller.signal.aborted) setRequested(false);
            });

        return () => controller.abort();
    }, [requested, ticket.reportedUserId]);

    if (pastSanctions === null) {
        return (
            <div className="flex items-center gap-1.5 text-[11px]">
                <HousekeepingButton disabled={requested} gap={1} size="sm" variant="secondary" onClick={() => setRequested(true)}>
                    <FaGavel size={9} />
                    <span>{LocalizeText('housekeeping.support.escalation.check', ['user'], [ticket.reportedUserName])}</span>
                </HousekeepingButton>
                {failed && <span className="text-[10px] text-rose-600">{LocalizeText('housekeeping.list.failed')}</span>}
            </div>
        );
    }

    const suggestion = suggestHousekeepingSanction(pastSanctions, steps, templates);

    const apply = (template: HousekeepingSanctionTemplate) => {
        const { name, reason } = localizeSanctionTemplate(template);
        const fullReason = `${reason} (#${ticket.issueId})`;
        const userId = ticket.reportedUserId;

        confirm(LocalizeText('housekeeping.support.escalation.confirm', ['sanction', 'user'], [name, ticket.reportedUserName]), async () => {
            const result = await (template.type === HousekeepingSanctionType.BAN
                ? banUser(userId, fullReason, template.durationValue)
                : template.type === HousekeepingSanctionType.MUTE
                  ? muteUser(userId, fullReason, template.durationValue)
                  : template.type === HousekeepingSanctionType.TRADE_LOCK
                    ? tradeLockUser(userId, template.durationValue, fullReason)
                    : kickUser(userId, fullReason));

            if (result?.ok) setApplied(true);
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 rounded border border-rose-200 bg-rose-50/40 px-1.5 py-1 text-[11px]">
            <FaGavel className="shrink-0 text-rose-600" size={9} />
            <span className="text-zinc-700">
                {LocalizeText('housekeeping.support.escalation.history', ['user', 'count'], [ticket.reportedUserName, String(pastSanctions)])}
            </span>
            {suggestion ? (
                <>
                    <HousekeepingPill tone="danger">{localizeSanctionTemplate(suggestion).name}</HousekeepingPill>
                    {applied ? (
                        <span className="ml-auto text-[10px] text-emerald-700">{LocalizeText('housekeeping.support.escalation.applied')}</span>
                    ) : (
                        <HousekeepingButton
                            classNames={['ml-auto']}
                            disabled={isActionPending}
                            gap={1}
                            size="sm"
                            variant="danger"
                            onClick={() => apply(suggestion)}
                        >
                            <FaGavel size={9} />
                            <span>{LocalizeText('housekeeping.support.escalation.apply')}</span>
                        </HousekeepingButton>
                    )}
                </>
            ) : (
                <span className="text-zinc-500">{LocalizeText('housekeeping.support.escalation.none')}</span>
            )}
        </div>
    );
};
