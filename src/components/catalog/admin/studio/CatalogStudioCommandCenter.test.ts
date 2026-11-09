import { describe, expect, it } from 'vitest';
import * as CommandCenter from './CatalogStudioCommandCenter';

const { getCatalogStudioCommandState, getCatalogStudioWorkspaceTabs } = CommandCenter;

describe('Catalog Manager command center state', () => {
    it('reports live problems without a publication state', () => {
        const state = getCatalogStudioCommandState({
            sessionReady: true,
            validationCurrent: false,
            validationIssueCount: 0,
            loading: false
        });

        expect(state.phase).toBe('ready');
        expect(state.canValidate).toBe(true);
        expect('canPublish' in state).toBe(false);
        expect('pendingLabel' in state).toBe(false);
    });

    it('marks the live catalog as needing repair when validation found issues', () => {
        const state = getCatalogStudioCommandState({
            sessionReady: true,
            validationCurrent: true,
            validationIssueCount: 4,
            loading: false
        });

        expect(state.phase).toBe('blocked');
        expect(state.validationLabel).toBe('4 live problems');
    });

    it('shows a neutral loading state while the first session is opening', () => {
        const state = getCatalogStudioCommandState({
            sessionReady: false,
            validationCurrent: false,
            validationIssueCount: 0,
            loading: true
        });

        expect(state.phase).toBe('loading');
        expect(state.canValidate).toBe(false);
    });

    it('exposes only the three essential workspace areas', () => {
        expect(getCatalogStudioWorkspaceTabs()).toEqual([ 'catalog', 'sql', 'history' ]);
    });
});
