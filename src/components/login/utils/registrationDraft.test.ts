/* @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearRegistrationDraft,
    loadRegistrationDraft,
    REGISTRATION_DRAFT_MAX_AGE_MS,
    REGISTRATION_DRAFT_STORAGE_KEY,
    saveRegistrationDraft
} from './registrationDraft';

const draft = {
    step: 'room' as const,
    email: 'habbo@example.com',
    username: 'DraftHabbo',
    gender: 'F' as const,
    selection: {
        hr: { partId: 515, colors: [45] },
        ha: { partId: 6366, colors: [40] }
    },
    selectedTemplateId: 2
};

describe('registration drafts', () => {
    beforeEach(() => {
        window.localStorage.clear();
        vi.useRealTimers();
    });

    it('round-trips safe signup progress without storing a password', () => {
        saveRegistrationDraft(draft);

        const stored = window.localStorage.getItem(REGISTRATION_DRAFT_STORAGE_KEY);
        expect(stored).not.toContain('password');
        expect(loadRegistrationDraft()).toMatchObject(draft);
    });

    it('removes expired drafts', () => {
        window.localStorage.setItem(REGISTRATION_DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, updatedAt: Date.now() - REGISTRATION_DRAFT_MAX_AGE_MS - 1 }));

        expect(loadRegistrationDraft()).toBeNull();
        expect(window.localStorage.getItem(REGISTRATION_DRAFT_STORAGE_KEY)).toBeNull();
    });

    it('clears saved progress explicitly', () => {
        saveRegistrationDraft(draft);
        clearRegistrationDraft();

        expect(loadRegistrationDraft()).toBeNull();
    });
});
