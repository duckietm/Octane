import { LocalizeText } from '../utils/LocalizeText';
import { HousekeepingSanctionTemplate } from './HousekeepingSanctionTemplates';

/** A canned answer to the reporter of a ticket; the text files translate it by id. */
export interface HousekeepingTicketReply {
    id: string;
    text: string;
}

export const HK_TICKET_REPLIES: HousekeepingTicketReply[] = [
    { id: 'thanks', text: 'Thank you for your report. We are looking into it.' },
    { id: 'handled', text: 'Thank you for your report. We have taken action.' },
    { id: 'more_info', text: 'We need more details to act on your report. Please report again with what happened and when.' },
    { id: 'no_violation', text: 'We looked into your report and found no breach of the hotel rules.' },
    { id: 'false_report', text: 'This report was not accurate. Please use the help button only for real problems.' }
];

export const HOUSEKEEPING_TICKET_REPLIES_KEY = 'housekeeping.ticket_replies';

/** `housekeeping.ticket_replies` when set and valid ({id, text} entries with unique ids), else the defaults. */
export const resolveTicketReplies = (configured: unknown): HousekeepingTicketReply[] => {
    if (!Array.isArray(configured)) return HK_TICKET_REPLIES;

    const seen = new Set<string>();
    const replies: HousekeepingTicketReply[] = [];

    for (const raw of configured) {
        if (!raw || typeof raw !== 'object') continue;

        const entry = raw as Partial<HousekeepingTicketReply>;
        const id = typeof entry.id === 'string' ? entry.id.trim() : '';

        if (!id || seen.has(id)) continue;

        seen.add(id);
        replies.push({ id, text: typeof entry.text === 'string' ? entry.text : '' });
    }

    return replies.length ? replies : HK_TICKET_REPLIES;
};

/** The reply in the operator's language: "housekeeping.ticket_reply.<id>" when translated, else its own text. */
export const localizeTicketReply = (reply: HousekeepingTicketReply): string => {
    const key = `housekeeping.ticket_reply.${reply.id}`;
    const text = LocalizeText(key);

    return text && text !== key ? text : reply.text;
};

/** From `after` past sanctions on, the escalation suggests `templateId`. */
export interface HousekeepingEscalationStep {
    after: number;
    templateId: string;
}

export const HK_ESCALATION_STEPS: HousekeepingEscalationStep[] = [
    { after: 0, templateId: 'mute_5m' },
    { after: 1, templateId: 'mute_60m' },
    { after: 2, templateId: 'ban_24h' },
    { after: 3, templateId: 'ban_7d' },
    { after: 5, templateId: 'ban_30d' }
];

export const HOUSEKEEPING_ESCALATION_KEY = 'housekeeping.escalation';

/** `housekeeping.escalation` when set and valid ({after >= 0, templateId}), sorted by after; else the defaults. */
export const resolveEscalationSteps = (configured: unknown): HousekeepingEscalationStep[] => {
    if (!Array.isArray(configured)) return HK_ESCALATION_STEPS;

    const steps = configured
        .filter((raw): raw is Partial<HousekeepingEscalationStep> => !!raw && typeof raw === 'object')
        .map((raw) => ({ after: Number(raw.after), templateId: typeof raw.templateId === 'string' ? raw.templateId.trim() : '' }))
        .filter((step) => Number.isInteger(step.after) && step.after >= 0 && step.templateId);

    return steps.length ? steps.sort((a, b) => a.after - b.after) : HK_ESCALATION_STEPS;
};

/**
 * The sanction the escalation suggests after `pastSanctions`: the template of the highest step
 * reached, or null when no step is reached or its template does not exist.
 */
export const suggestHousekeepingSanction = (
    pastSanctions: number,
    steps: HousekeepingEscalationStep[],
    templates: HousekeepingSanctionTemplate[]
): HousekeepingSanctionTemplate | null => {
    let reached: HousekeepingEscalationStep | null = null;

    for (const step of steps) {
        if (step.after <= pastSanctions && (!reached || step.after >= reached.after)) reached = step;
    }

    return reached ? (templates.find((template) => template.id === reached.templateId) ?? null) : null;
};
