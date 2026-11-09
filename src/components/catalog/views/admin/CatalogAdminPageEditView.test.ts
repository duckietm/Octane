/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import * as PageEditor from './CatalogAdminPageEditView';
import { createCatalogAdminPageDetailsFromSnapshot } from './CatalogAdminPageState';

describe('catalog admin page form state', () => {
    it('uses the selected catalog node name while page details are loading', () => {
        const resolveDisplayName = (PageEditor as any).resolveCatalogAdminPageDisplayName;

        expect(resolveDisplayName('', '', 'Front Page (12)', 'front_page', 'Untitled page')).toBe('Front Page');
    });

    it('explains each blocking state instead of silently disabling save', () => {
        const resolveInteraction = (PageEditor as any).resolveCatalogAdminPageInteraction;

        expect(resolveInteraction(false, false, false, false, null)).toMatchObject({
            canSave: false,
            message: 'Connecting to Catalog Studio...'
        });
        expect(resolveInteraction(true, false, false, false, null)).toMatchObject({
            canSave: false,
            message: 'Loading page details...'
        });
        expect(resolveInteraction(true, true, false, false, null)).toMatchObject({
            canSave: false,
            message: 'Waiting for the live catalog revision...'
        });
        expect(resolveInteraction(true, true, true, false, null)).toMatchObject({
            canSave: true,
            message: null
        });
        expect(resolveInteraction(true, true, true, false, 'Lock denied')).toMatchObject({
            canSave: false,
            message: 'Lock denied'
        });
    });

    it('maps the complete Catalog Studio page snapshot into editor details', () => {
        const details = createCatalogAdminPageDetailsFromSnapshot({
            catalogType: 'NORMAL',
            pageId: 976,
            parentId: -1,
            captionSave: 'front_page',
            caption: '[Front Page]',
            pageLayout: 'frontpage',
            iconColor: 2,
            iconImage: 7,
            minRank: 4,
            orderNum: 3,
            visible: true,
            enabled: true,
            clubOnly: false,
            catalogMode: 'NORMAL',
            vipOnly: false,
            pageHeadline: 'headline',
            pageTeaser: 'teaser',
            pageSpecial: 'special',
            pageText1: 'one',
            pageText2: 'two',
            pageTextDetails: 'details',
            pageTextTeaser: 'teaser text',
            roomId: 0,
            includes: '12;13'
        });

        expect(details).toMatchObject({
            pageId: 976,
            caption: '[Front Page]',
            captionSave: 'front_page',
            layout: 'frontpage',
            iconColor: 2,
            iconImage: 7,
            minRank: 4,
            headline: 'headline',
            textOne: 'one',
            includes: '12;13'
        });
    });

    it('uses the authoritative database values returned for the selected page', () => {
        const createFormState = (PageEditor as any).createCatalogAdminPageFormState;
        const state = createFormState({
            pageId: 42,
            caption: 'Guild shop',
            captionSave: 'guild_shop',
            parentId: 7,
            catalogMode: 'BOTH',
            layout: 'guild_furni',
            iconColor: 3,
            iconImage: 145,
            minRank: 5,
            orderNum: 9,
            visible: true,
            enabled: false,
            clubOnly: true,
            vipOnly: false,
            headline: 'headline',
            teaser: 'teaser',
            special: 'special',
            textOne: 'text one',
            textTwo: 'text two',
            textDetails: 'details',
            textTeaser: 'teaser text',
            roomId: 123,
            includes: '1;2;3'
        });

        expect(state).toMatchObject({
            caption: 'Guild shop',
            captionSave: 'guild_shop',
            parentId: 7,
            catalogMode: 'BOTH',
            pageLayout: 'guild_furni',
            iconColor: 3,
            iconImage: 145,
            minRank: 5,
            orderNum: 9,
            visible: '1',
            enabled: '0',
            clubOnly: '1',
            vipOnly: '0',
            pageHeadline: 'headline',
            pageTeaser: 'teaser',
            pageSpecial: 'special',
            pageText1: 'text one',
            pageText2: 'text two',
            pageTextDetails: 'details',
            pageTextTeaser: 'teaser text',
            roomId: 123,
            includes: '1;2;3'
        });
    });

    it('preserves legacy negative page ordering when editing existing data', () => {
        const createFormState = (PageEditor as any).createCatalogAdminPageFormState;
        const validate = (PageEditor as any).validateCatalogAdminPageForm;
        const state = createFormState({
            pageId: 42,
            caption: 'Legacy page',
            captionSave: 'legacy_page',
            parentId: -1,
            catalogMode: 'NORMAL',
            layout: 'default_3x3',
            iconColor: 1,
            iconImage: 1,
            minRank: 1,
            orderNum: -1000,
            visible: true,
            enabled: true,
            clubOnly: false,
            vipOnly: false,
            headline: '',
            teaser: '',
            special: '',
            textOne: '',
            textTwo: '',
            textDetails: '',
            textTeaser: '',
            roomId: 0,
            includes: ''
        });

        expect(state.orderNum).toBe(-1000);
        expect(validate(state)).toBeNull();
    });

    it('creates a new-page form without writing a placeholder page first', () => {
        const createNewFormState = (PageEditor as any).createCatalogAdminNewPageFormState;

        expect(createNewFormState(7, 'NORMAL', 12)).toMatchObject({
            pageId: undefined,
            caption: '',
            captionSave: '',
            parentId: 7,
            catalogMode: 'NORMAL',
            pageLayout: 'default_3x3',
            iconImage: 0,
            minRank: 1,
            orderNum: 12,
            visible: '1',
            enabled: '1'
        });
    });

    it('validates required page fields and included page ids', () => {
        const validate = (PageEditor as any).validateCatalogAdminPageForm;
        const valid = (PageEditor as any).createCatalogAdminNewPageFormState(7, 'NORMAL');

        expect(validate({ ...valid, caption: 'New page', includes: '1;2,3' })).toBeNull();
        expect(validate(valid)).toMatch(/caption/i);
        expect(validate({ ...valid, caption: 'New page', includes: '1;abc' })).toMatch(/included/i);
        expect(validate({ ...valid, caption: 'New page', minRank: 0 })).toMatch(/rank/i);
    });
});
