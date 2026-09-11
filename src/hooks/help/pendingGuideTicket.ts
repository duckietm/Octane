/**
 * Official HelpController.showPendingTicket: when the help button is pressed
 * while a guide ticket is still open, the reporting status packet comes back
 * with status 1 and the pending ticket, and one of four popups is shown
 * instead of the help window.
 */

/** GuideReportingStatusMessageParser status codes. */
export const GUIDE_REPORTING_STATUS_OK = 0;
export const GUIDE_REPORTING_STATUS_PENDING_TICKET = 1;
export const GUIDE_REPORTING_STATUS_ABUSIVE = 2;
export const GUIDE_REPORTING_STATUS_REPORTING_TOO_QUICKLY = 3;

/** GuideSessionCreateMessageComposer request types. */
export const GUIDE_TICKET_TYPE_TOUR = 0;
export const GUIDE_TICKET_TYPE_INSTRUCTIONS = 1;
export const GUIDE_TICKET_TYPE_TOUR_ALT = 2;
export const GUIDE_TICKET_TYPE_BULLY = 3;

export type PendingGuideTicketLayout = 'guide' | 'tour' | 'instructions' | 'bully';

/**
 * Which pending popup fits the ticket: the guide's own case wins, then the
 * request type; unknown types show nothing (official `default: return`).
 */
export const resolvePendingGuideTicketLayout = (ticket: { isGuide: boolean; type: number }): PendingGuideTicketLayout | null => {
    if (ticket.isGuide) return 'guide';

    switch (ticket.type) {
        case GUIDE_TICKET_TYPE_TOUR:
        case GUIDE_TICKET_TYPE_TOUR_ALT:
            return 'tour';
        case GUIDE_TICKET_TYPE_INSTRUCTIONS:
            return 'instructions';
        case GUIDE_TICKET_TYPE_BULLY:
            return 'bully';
        default:
            return null;
    }
};

export const getPendingGuideTicketKeys = (layout: PendingGuideTicketLayout) => ({
    title: `guide.pending.${layout}.title`,
    subtitle: `guide.pending.${layout}.subtitle`,
    description: `guide.pending.${layout}.description`,
    /** Only the instructions and bully popups show the pending report itself. */
    report: layout === 'instructions' || layout === 'bully' ? `guide.pending.${layout}.report` : null
});

/** The illustration next to the popup, as the official layouts embed it. */
export const getPendingGuideTicketIllustration = (layout: PendingGuideTicketLayout): 'tour' | 'question' | 'bully' => {
    if (layout === 'tour') return 'tour';

    if (layout === 'bully') return 'bully';

    return 'question';
};
