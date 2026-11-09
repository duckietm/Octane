import { describe, expect, it } from 'vitest';
import { catalogAdminSmartSaveReducer, createCatalogAdminSmartSaveState, isCatalogAdminFormDirty, mergeCatalogAdminCommittedForm } from './CatalogAdminSmartSaveState';

interface FormState
{
    caption: string;
    minRank: number;
}

describe('CatalogAdminSmartSaveState', () =>
{
    it('tracks edits and restores the authoritative baseline', () =>
    {
        const initial = createCatalogAdminSmartSaveState<FormState>({ caption: 'Original', minRank: 1 });
        const dirty = catalogAdminSmartSaveReducer(initial, { type: 'patch', patch: { caption: 'Edited' } });
        const reset = catalogAdminSmartSaveReducer(dirty, { type: 'reset' });

        expect(dirty.status).toBe('dirty');
        expect(isCatalogAdminFormDirty(dirty.baseline, dirty.draft)).toBe(true);
        expect(reset.draft).toEqual({ caption: 'Original', minRank: 1 });
        expect(reset.status).toBe('saved');
    });

    it('preserves edits made after submit while applying server normalization', () =>
    {
        const submitted = { caption: 'First', minRank: 1 };
        const current = { caption: 'Second', minRank: 1 };
        const committed = { caption: 'First', minRank: 2 };

        expect(mergeCatalogAdminCommittedForm(submitted, current, committed)).toEqual({
            caption: 'Second',
            minRank: 2
        });
    });

    it('acknowledges only the matching operation and keeps a newer draft dirty', () =>
    {
        let state = createCatalogAdminSmartSaveState<FormState>({ caption: 'Original', minRank: 1 });
        state = catalogAdminSmartSaveReducer(state, { type: 'patch', patch: { caption: 'First' } });
        state = catalogAdminSmartSaveReducer(state, {
            type: 'submit', operationId: 'save-page-1', submitted: state.draft, closeAfter: false
        });
        state = catalogAdminSmartSaveReducer(state, { type: 'patch', patch: { caption: 'Second' } });

        const unmatched = catalogAdminSmartSaveReducer(state, {
            type: 'success', operationId: 'other', committed: { caption: 'First', minRank: 2 }, savedAt: 10
        });
        const acknowledged = catalogAdminSmartSaveReducer(state, {
            type: 'success', operationId: 'save-page-1', committed: { caption: 'First', minRank: 2 }, savedAt: 10
        });

        expect(unmatched).toBe(state);
        expect(acknowledged.draft).toEqual({ caption: 'Second', minRank: 2 });
        expect(acknowledged.baseline).toEqual({ caption: 'First', minRank: 2 });
        expect(acknowledged.status).toBe('dirty');
        expect(acknowledged.lastSavedAt).toBe(10);
    });

    it('queues a save intent and exposes validation or conflict feedback', () =>
    {
        let state = createCatalogAdminSmartSaveState<FormState>({ caption: 'Original', minRank: 1 });
        state = catalogAdminSmartSaveReducer(state, { type: 'patch', patch: { caption: 'Edited' } });
        state = catalogAdminSmartSaveReducer(state, {
            type: 'submit', operationId: 'save-page-1', submitted: state.draft, closeAfter: false
        });
        state = catalogAdminSmartSaveReducer(state, { type: 'queue', closeAfter: true });
        const failed = catalogAdminSmartSaveReducer(state, {
            type: 'failure', operationId: 'save-page-1', message: 'Invalid', fieldErrors: { caption: 'Required' }
        });

        expect(state.queued).toEqual({ closeAfter: true });
        expect(failed.status).toBe('error');
        expect(failed.fieldErrors.caption).toBe('Required');

        const resubmitted = catalogAdminSmartSaveReducer(failed, {
            type: 'submit', operationId: 'save-page-2', submitted: failed.draft, closeAfter: false
        });
        const conflict = catalogAdminSmartSaveReducer(resubmitted, {
            type: 'conflict', operationId: 'save-page-2', message: 'Revision changed'
        });
        expect(conflict.status).toBe('conflict');
    });
});
