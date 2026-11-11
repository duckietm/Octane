import { describe, expect, it } from 'vitest';
import { FIRST_LOGIN_NO_ROOM, firstLoginAnswer, usableFirstLoginTemplates } from './FirstLoginSetup';

const room = (templateId: number, title = 'Loft') => ({ templateId, title, description: ' Cosy ', thumbnail: '' });

describe('first-login setup', () => {
    it('keeps the rooms with a real id, each once, with tidy texts', () => {
        const usable = usableFirstLoginTemplates([room(3), room(0), room(3, 'Twice'), room(5, '  ')]);

        expect(usable.map((template) => template.templateId)).toEqual([3, 5]);
        expect(usable[0].description).toBe('Cosy');
        expect(usable[1].title).toBe('#5');
    });

    it('has no rooms when the server sent none', () => {
        expect(usableFirstLoginTemplates(null)).toEqual([]);
    });

    it('answers with the chosen room only when it was offered', () => {
        const templates = usableFirstLoginTemplates([room(3)]);

        expect(firstLoginAnswer(3, templates)).toBe(3);
        expect(firstLoginAnswer(9, templates)).toBe(FIRST_LOGIN_NO_ROOM);
        expect(firstLoginAnswer(null, templates)).toBe(FIRST_LOGIN_NO_ROOM);
    });
});
