import { describe, expect, it } from 'vitest';
import { applyCatalogStudioMutation } from './CatalogStudioMutationState';
import { CatalogStudioMutationResult, CatalogStudioPageSnapshot, CatalogStudioSession } from './CatalogStudioTypes';

const page = (catalogType: 'NORMAL' | 'BUILDER', pageId: number, caption: string): CatalogStudioPageSnapshot => ({
    catalogType, pageId, parentId: -1, captionSave: `page_${pageId}`, caption, pageLayout: 'default_3x3',
    iconColor: 1, iconImage: 1, minRank: 1, orderNum: 1, visible: true, enabled: true,
    clubOnly: false, catalogMode: catalogType, vipOnly: false, pageHeadline: '', pageTeaser: '',
    pageSpecial: '', pageText1: '', pageText2: '', pageTextDetails: '', pageTextTeaser: '', roomId: 0, includes: ''
});

const session = (): CatalogStudioSession => ({
    activeVersionId: 11, draftVersionId: 12, revision: 7, activeUpdatedAt: '', draftCreatedAt: '',
    pendingCount: 3, actors: [], validationCurrent: true, validationIssueCount: 0, publishedVersions: [],
    pages: [ page('NORMAL', 42, 'Original'), page('BUILDER', 42, 'Builder') ], offers: []
});

const mutation = (entity: CatalogStudioPageSnapshot): CatalogStudioMutationResult => ({
    operationId: 'save-page-1', action: 'savePage', revision: 8, entityType: 'PAGE', catalogType: entity.catalogType,
    entity, historyGroup: {
        id: 91, revision: 8, actorId: 9, actorName: 'Alice', summary: 'Edit page', source: 'UI', createdAt: '',
        entries: [ { entityType: 'PAGE', entityId: entity.pageId, operation: 'UPDATE' } ]
    }
});

describe('applyCatalogStudioMutation', () =>
{
    it('replaces only the matching catalog identity and advances draft metadata', () =>
    {
        const original = session();
        const result = applyCatalogStudioMutation(original, mutation(page('NORMAL', 42, 'Renamed')));

        expect(result).toMatchObject({ revision: 8, pendingCount: 4, validationCurrent: false });
        expect(result.pages.find(entry => entry.catalogType === 'NORMAL' && entry.pageId === 42)?.caption).toBe('Renamed');
        expect(result.pages.find(entry => entry.catalogType === 'BUILDER' && entry.pageId === 42)?.caption).toBe('Builder');
        expect(original.pages[0].caption).toBe('Original');
        expect(result.pages).not.toBe(original.pages);
    });

    it('inserts a newly committed entity when no identity exists', () =>
    {
        const result = applyCatalogStudioMutation(session(), {
            ...mutation(page('NORMAL', 55, 'New page')),
            action: 'createPage'
        });

        expect(result.pages).toHaveLength(3);
        expect(result.pages.at(-1)?.pageId).toBe(55);
    });
});
