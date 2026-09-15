import { describe, expect, it } from 'vitest';
import { getPendingGuideTicketIllustration, getPendingGuideTicketKeys, resolvePendingGuideTicketLayout } from './pendingGuideTicket';

describe('resolvePendingGuideTicketLayout', () => {
    it('picks the popup from the guide flag and the request type', () => {
        expect(resolvePendingGuideTicketLayout({ isGuide: true, type: 1 })).toBe('guide');
        expect(resolvePendingGuideTicketLayout({ isGuide: false, type: 0 })).toBe('tour');
        expect(resolvePendingGuideTicketLayout({ isGuide: false, type: 2 })).toBe('tour');
        expect(resolvePendingGuideTicketLayout({ isGuide: false, type: 1 })).toBe('instructions');
        expect(resolvePendingGuideTicketLayout({ isGuide: false, type: 3 })).toBe('bully');
        expect(resolvePendingGuideTicketLayout({ isGuide: false, type: 9 })).toBeNull();
    });
});

describe('getPendingGuideTicketKeys', () => {
    it('only the instructions and bully popups carry the report block', () => {
        expect(getPendingGuideTicketKeys('tour')).toEqual({
            title: 'guide.pending.tour.title',
            subtitle: 'guide.pending.tour.subtitle',
            description: 'guide.pending.tour.description',
            report: null
        });
        expect(getPendingGuideTicketKeys('bully').report).toBe('guide.pending.bully.report');
        expect(getPendingGuideTicketKeys('instructions').report).toBe('guide.pending.instructions.report');
        expect(getPendingGuideTicketKeys('guide').report).toBeNull();
    });
});

describe('getPendingGuideTicketIllustration', () => {
    it('uses the tour, bully or question picture', () => {
        expect(getPendingGuideTicketIllustration('tour')).toBe('tour');
        expect(getPendingGuideTicketIllustration('bully')).toBe('bully');
        expect(getPendingGuideTicketIllustration('instructions')).toBe('question');
        expect(getPendingGuideTicketIllustration('guide')).toBe('question');
    });
});
