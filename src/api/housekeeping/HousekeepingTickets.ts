/** The ticket fields the support page groups on; IssueMessageData carries them. */
export interface HousekeepingTicketLike {
    issueId: number;
    state: number;
    pickerUserId: number;
    issueAgeInMilliseconds: number;
}

/** IssueMessageData.STATE_OPEN / STATE_PICKED. */
export const HK_TICKET_STATE_OPEN = 1;
export const HK_TICKET_STATE_PICKED = 2;

/**
 * Open tickets waiting for someone, tickets the operator picked, and tickets
 * other staff picked; oldest first in each group, closed tickets left out.
 */
export const groupHousekeepingTickets = <T extends HousekeepingTicketLike>(tickets: readonly T[], myUserId: number): { open: T[]; mine: T[]; others: T[] } => {
    const oldestFirst = [...tickets].sort((a, b) => b.issueAgeInMilliseconds - a.issueAgeInMilliseconds);

    return {
        open: oldestFirst.filter((ticket) => ticket.state === HK_TICKET_STATE_OPEN),
        mine: oldestFirst.filter((ticket) => ticket.state === HK_TICKET_STATE_PICKED && ticket.pickerUserId === myUserId),
        others: oldestFirst.filter((ticket) => ticket.state === HK_TICKET_STATE_PICKED && ticket.pickerUserId !== myUserId)
    };
};
