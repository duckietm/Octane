import { describe, expect, it } from 'vitest';
import { CATALOG_STUDIO_LAYOUT_CODES, getCatalogLayoutDefinition, isCatalogStudioLayoutCode, isReadOnlyCatalogAdminLayout } from './catalogLayoutRegistry';

const expectedStudioCodes = [
    'default_3x3',
    'club_buy',
    'club_gift',
    'frontpage',
    'pets',
    'pets2',
    'pets3',
    'spaces_new',
    'spaces',
    'soundmachine',
    'trophies',
    'roomads',
    'guilds',
    'guild_forum',
    'guild_furni',
    'vip_buy',
    'builders_club_frontpage',
    'builders_club_addons',
    'builders_club_loyalty',
    'marketplace',
    'marketplace_own_items',
    'recycler',
    'recycler_info',
    'recycler_prizes',
    'info_loyalty',
    'info_duckets',
    'info_rentables',
    'info_pets',
    'info_pets2',
    'info_pets3',
    'loyalty_vip_buy',
    'badge_display',
    'bots',
    'single_bundle',
    'sold_ltd_items',
    'plasto',
    'default_3x3_color_grouping',
    'recent_purchases',
    'room_bundle',
    'petcustomization',
    'frontpage_featured',
    'root',
    'monkey',
    'niko',
    'mad_money',
    'productpage1',
    'collectibles'
] as const;

describe('catalog layout registry', () => {
    it('provides the complete selectable layout contract without duplicates', () => {
        expect(CATALOG_STUDIO_LAYOUT_CODES).toEqual(expectedStudioCodes);
        expect(new Set(CATALOG_STUDIO_LAYOUT_CODES).size).toBe(CATALOG_STUDIO_LAYOUT_CODES.length);
    });

    it('resolves server aliases to explicit renderers', () => {
        expect(getCatalogLayoutDefinition('frontpage4')?.renderer).toBe('frontpage');
        expect(getCatalogLayoutDefinition('guild_custom_furni')?.renderer).toBe('guildCustomFurni');
        expect(getCatalogLayoutDefinition('club_gifts')?.renderer).toBe('clubGifts');
        expect(getCatalogLayoutDefinition('default_3x3')?.renderer).toBe('default');
    });

    it('routes the official info_pets2 / info_pets3 layouts (layout_info_pets2.xml, layout_info_pets3.xml) to the pet info renderers', () => {
        expect(getCatalogLayoutDefinition('info_pets2')?.renderer).toBe('pets2');
        expect(getCatalogLayoutDefinition('info_pets3')?.renderer).toBe('pets3');
        expect(isCatalogStudioLayoutCode('info_pets2')).toBe(true);
    });

    it('rejects unknown layout identifiers instead of treating them as standard pages', () => {
        expect(getCatalogLayoutDefinition('future_layout')).toBeNull();
        expect(isCatalogStudioLayoutCode('future_layout')).toBe(false);
        expect(isCatalogStudioLayoutCode('recycler')).toBe(true);
    });

    it('marks runtime-generated layouts as read-only for the admin editor', () => {
        expect(isReadOnlyCatalogAdminLayout('recent_purchases')).toBe(true);
        expect(isReadOnlyCatalogAdminLayout('default_3x3')).toBe(false);
        expect(isReadOnlyCatalogAdminLayout(null)).toBe(false);
        expect(isReadOnlyCatalogAdminLayout(undefined)).toBe(false);
    });
});
