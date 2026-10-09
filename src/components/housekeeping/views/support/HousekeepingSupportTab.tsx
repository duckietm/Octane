import { CloseIssuesMessageComposer, GetSessionDataManager, IssueMessageData, PickIssuesMessageComposer, ReleaseIssuesMessageComposer } from '@octane/renderer';
import { FC } from 'react';
import { FaCheck, FaHandPaper, FaInbox, FaTimes, FaUndo, FaUser, FaUserShield } from 'react-icons/fa';
import { groupHousekeepingTickets, HousekeepingTabId, LocalizeText, SendMessageComposer } from '../../../../api';
import { useHousekeepingStore, useModTools } from '../../../../hooks';
import { HousekeepingButton, HousekeepingEmptyState, HousekeepingPill, HousekeepingSection } from '../common/HousekeepingParts';
import { HousekeepingTicketEscalationView } from './HousekeepingTicketEscalationView';
import { HousekeepingTicketReplyView } from './HousekeepingTicketReplyView';

type TicketGroup = 'open' | 'mine' | 'others';

const TicketCard: FC<{ ticket: IssueMessageData; group: TicketGroup; onOpenUser: (userId: number) => void }> = ({ ticket, group, onOpenUser }) => {
    const close = (resolution: number) => SendMessageComposer(new CloseIssuesMessageComposer([ticket.issueId], resolution));

    return (
        <div className="flex flex-col gap-1 rounded border border-zinc-200 bg-white p-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-zinc-800">#{ticket.issueId}</span>
                <HousekeepingPill tone={ticket.priority > 0 ? 'danger' : 'neutral'}>
                    {LocalizeText('housekeeping.support.priority', ['priority'], [String(ticket.priority)])}
                </HousekeepingPill>
                <span className="text-zinc-500">{ticket.getOpenTime(Date.now())}</span>
                {group === 'others' && ticket.pickerUserName && (
                    <HousekeepingPill icon={<FaUserShield size={8} />} tone="accent">
                        {ticket.pickerUserName}
                    </HousekeepingPill>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-zinc-600">
                <button className="flex items-center gap-1 hover:text-sky-700" type="button" onClick={() => onOpenUser(ticket.reporterUserId)}>
                    <FaUser size={8} />
                    {LocalizeText('housekeeping.support.reporter')}: <span className="font-semibold">{ticket.reporterUserName}</span>
                </button>
                {ticket.reportedUserId > 0 && (
                    <button className="flex items-center gap-1 hover:text-rose-700" type="button" onClick={() => onOpenUser(ticket.reportedUserId)}>
                        <FaUser size={8} />
                        {LocalizeText('housekeeping.support.reported')}: <span className="font-semibold">{ticket.reportedUserName}</span>
                    </button>
                )}
            </div>
            {ticket.message && <p className="m-0 whitespace-pre-wrap break-words rounded bg-zinc-50 px-1.5 py-1 text-zinc-800">{ticket.message}</p>}
            {group === 'mine' && ticket.reportedUserId > 0 && <HousekeepingTicketEscalationView ticket={ticket} />}
            {group === 'mine' && ticket.reporterUserId > 0 && <HousekeepingTicketReplyView ticket={ticket} />}
            <div className="flex flex-wrap items-center gap-1">
                {group === 'open' && (
                    <HousekeepingButton
                        gap={1}
                        size="sm"
                        variant="primary"
                        onClick={() => SendMessageComposer(new PickIssuesMessageComposer([ticket.issueId], false, 0, 'housekeeping pick'))}
                    >
                        <FaHandPaper size={9} />
                        <span>{LocalizeText('housekeeping.support.pick')}</span>
                    </HousekeepingButton>
                )}
                {group === 'mine' && (
                    <>
                        <HousekeepingButton gap={1} size="sm" variant="success" onClick={() => close(CloseIssuesMessageComposer.RESOLUTION_RESOLVED)}>
                            <FaCheck size={9} />
                            <span>{LocalizeText('housekeeping.support.close.resolved')}</span>
                        </HousekeepingButton>
                        <HousekeepingButton gap={1} size="sm" variant="secondary" onClick={() => close(CloseIssuesMessageComposer.RESOLUTION_USELESS)}>
                            <FaTimes size={9} />
                            <span>{LocalizeText('housekeeping.support.close.useless')}</span>
                        </HousekeepingButton>
                        <HousekeepingButton gap={1} size="sm" variant="danger" onClick={() => close(CloseIssuesMessageComposer.RESOLUTION_ABUSIVE)}>
                            <FaTimes size={9} />
                            <span>{LocalizeText('housekeeping.support.close.abusive')}</span>
                        </HousekeepingButton>
                        <HousekeepingButton
                            classNames={['ml-auto']}
                            gap={1}
                            size="sm"
                            variant="secondary"
                            onClick={() => SendMessageComposer(new ReleaseIssuesMessageComposer([ticket.issueId]))}
                        >
                            <FaUndo size={9} />
                            <span>{LocalizeText('housekeeping.support.release')}</span>
                        </HousekeepingButton>
                    </>
                )}
            </div>
        </div>
    );
};

/**
 * The call-for-help queue from the mod tools: the same tickets the mod tools
 * receive, with pick, release and close through the same messages.
 */
export const HousekeepingSupportTab: FC = () => {
    const { tickets = [] } = useModTools();
    const { lookupUserById, setActiveTab } = useHousekeepingStore();
    const groups = groupHousekeepingTickets(tickets, GetSessionDataManager().userId);

    const openUser = (userId: number) => {
        if (userId <= 0) return;

        setActiveTab(HousekeepingTabId.USERS);
        lookupUserById(userId);
    };

    const sections: { group: TicketGroup; titleKey: string; items: IssueMessageData[] }[] = [
        { group: 'mine', titleKey: 'housekeeping.support.mine', items: groups.mine },
        { group: 'open', titleKey: 'housekeeping.support.open', items: groups.open },
        { group: 'others', titleKey: 'housekeeping.support.others', items: groups.others }
    ];

    if (!groups.open.length && !groups.mine.length && !groups.others.length) {
        return <HousekeepingEmptyState icon={<FaInbox size={14} />}>{LocalizeText('housekeeping.support.empty')}</HousekeepingEmptyState>;
    }

    return (
        <div className="flex flex-col gap-2">
            {sections
                .filter((section) => section.items.length > 0)
                .map((section) => (
                    <HousekeepingSection
                        key={section.group}
                        aside={<HousekeepingPill>{section.items.length}</HousekeepingPill>}
                        title={LocalizeText(section.titleKey)}
                        tone={section.group === 'mine' ? 'info' : 'neutral'}
                    >
                        {section.items.map((ticket) => (
                            <TicketCard key={ticket.issueId} group={section.group} ticket={ticket} onOpenUser={openUser} />
                        ))}
                    </HousekeepingSection>
                ))}
        </div>
    );
};
