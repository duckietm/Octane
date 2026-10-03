import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/LocalizeText', () => ({
    LocalizeText: (key: string) => (key === 'housekeeping.ticket_reply.thanks' ? 'Grazie!' : key)
}));

import { HK_SANCTION_TEMPLATES } from './HousekeepingSanctionTemplates';
import {
    HK_ESCALATION_STEPS,
    HK_TICKET_REPLIES,
    localizeTicketReply,
    resolveEscalationSteps,
    resolveTicketReplies,
    suggestHousekeepingSanction
} from './HousekeepingTicketTools';

describe('ticket replies', () => {
    it('keeps the defaults when the configuration is missing or has nothing valid', () => {
        expect(resolveTicketReplies(null)).toBe(HK_TICKET_REPLIES);
        expect(resolveTicketReplies([{ text: 'no id' }])).toBe(HK_TICKET_REPLIES);
    });

    it('takes configured replies, dropping duplicates', () => {
        expect(resolveTicketReplies([{ id: 'a', text: 'One' }, { id: 'a', text: 'Again' }, { id: 'b' }])).toEqual([
            { id: 'a', text: 'One' },
            { id: 'b', text: '' }
        ]);
    });

    it('uses the translation when there is one, else the reply text', () => {
        expect(localizeTicketReply({ id: 'thanks', text: 'Thanks' })).toBe('Grazie!');
        expect(localizeTicketReply({ id: 'custom', text: 'Custom text' })).toBe('Custom text');
    });
});

describe('escalation', () => {
    it('suggests the step reached by the past sanctions', () => {
        const suggest = (count: number) => suggestHousekeepingSanction(count, HK_ESCALATION_STEPS, HK_SANCTION_TEMPLATES)?.id;

        expect(suggest(0)).toBe('mute_5m');
        expect(suggest(1)).toBe('mute_60m');
        expect(suggest(2)).toBe('ban_24h');
        expect(suggest(4)).toBe('ban_7d');
        expect(suggest(9)).toBe('ban_30d');
    });

    it('suggests nothing below the first step or for an unknown template', () => {
        expect(suggestHousekeepingSanction(0, [{ after: 1, templateId: 'ban_24h' }], HK_SANCTION_TEMPLATES)).toBeNull();
        expect(suggestHousekeepingSanction(3, [{ after: 0, templateId: 'nope' }], HK_SANCTION_TEMPLATES)).toBeNull();
    });

    it('reads configured steps in order and keeps the defaults otherwise', () => {
        expect(
            resolveEscalationSteps([
                { after: 2, templateId: 'ban_7d' },
                { after: 0, templateId: 'kick' },
                { after: -1, templateId: 'x' }
            ])
        ).toEqual([
            { after: 0, templateId: 'kick' },
            { after: 2, templateId: 'ban_7d' }
        ]);
        expect(resolveEscalationSteps('nonsense')).toBe(HK_ESCALATION_STEPS);
    });
});
