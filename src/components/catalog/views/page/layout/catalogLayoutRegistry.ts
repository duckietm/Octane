export type CatalogLayoutRenderer =
    | 'badgeDisplay'
    | 'buildersClubBuy'
    | 'clubGifts'
    | 'colorGrouping'
    | 'default'
    | 'frontpage'
    | 'guildCustomFurni'
    | 'guildForum'
    | 'guildFrontpage'
    | 'info'
    | 'infoLoyalty'
    | 'infoRentables'
    | 'marketplaceOwnItems'
    | 'marketplacePublicItems'
    | 'petCustomization'
    | 'pets'
    | 'pets2'
    | 'pets3'
    | 'roomAds'
    | 'roomBundle'
    | 'recycler'
    | 'recyclerPrizes'
    | 'singleBundle'
    | 'soundMachine'
    | 'spaces'
    | 'soldLimited'
    | 'trophies'
    | 'unavailable'
    | 'vipBuy';

export type CatalogLayoutAvailability = 'ready' | 'planned';

export interface CatalogLayoutDefinition {
    availability: CatalogLayoutAvailability;
    renderer: CatalogLayoutRenderer;
    runtimeCodes: readonly string[];
    studioCode?: string;
}

export const CATALOG_LAYOUT_REGISTRY = [
    { studioCode: 'default_3x3', runtimeCodes: ['default_3x3'], renderer: 'default', availability: 'ready' },
    { studioCode: 'club_buy', runtimeCodes: ['club_buy'], renderer: 'vipBuy', availability: 'ready' },
    { studioCode: 'club_gift', runtimeCodes: ['club_gifts', 'club_gift'], renderer: 'clubGifts', availability: 'ready' },
    { studioCode: 'frontpage', runtimeCodes: ['frontpage4', 'frontpage'], renderer: 'frontpage', availability: 'ready' },
    { studioCode: 'pets', runtimeCodes: ['pets'], renderer: 'pets', availability: 'ready' },
    { studioCode: 'pets2', runtimeCodes: ['pets2'], renderer: 'pets2', availability: 'ready' },
    { studioCode: 'pets3', runtimeCodes: ['pets3'], renderer: 'pets3', availability: 'ready' },
    { studioCode: 'spaces_new', runtimeCodes: ['spaces_new'], renderer: 'spaces', availability: 'ready' },
    { studioCode: 'spaces', runtimeCodes: ['spaces'], renderer: 'spaces', availability: 'ready' },
    { studioCode: 'soundmachine', runtimeCodes: ['soundmachine'], renderer: 'soundMachine', availability: 'ready' },
    { studioCode: 'trophies', runtimeCodes: ['trophies'], renderer: 'trophies', availability: 'ready' },
    { studioCode: 'roomads', runtimeCodes: ['roomads'], renderer: 'roomAds', availability: 'ready' },
    { studioCode: 'guilds', runtimeCodes: ['guild_frontpage', 'guilds'], renderer: 'guildFrontpage', availability: 'ready' },
    { studioCode: 'guild_forum', runtimeCodes: ['guild_forum'], renderer: 'guildForum', availability: 'ready' },
    { studioCode: 'guild_furni', runtimeCodes: ['guild_custom_furni', 'guild_furni'], renderer: 'guildCustomFurni', availability: 'ready' },
    { studioCode: 'vip_buy', runtimeCodes: ['vip_buy'], renderer: 'vipBuy', availability: 'ready' },
    { studioCode: 'builders_club_frontpage', runtimeCodes: ['builders_club_frontpage'], renderer: 'buildersClubBuy', availability: 'ready' },
    { studioCode: 'builders_club_addons', runtimeCodes: ['builders_club_addons'], renderer: 'buildersClubBuy', availability: 'ready' },
    { studioCode: 'builders_club_loyalty', runtimeCodes: ['builders_club_loyalty'], renderer: 'buildersClubBuy', availability: 'ready' },
    { studioCode: 'marketplace', runtimeCodes: ['marketplace'], renderer: 'marketplacePublicItems', availability: 'ready' },
    { studioCode: 'marketplace_own_items', runtimeCodes: ['marketplace_own_items'], renderer: 'marketplaceOwnItems', availability: 'ready' },
    { studioCode: 'recycler', runtimeCodes: ['recycler'], renderer: 'recycler', availability: 'ready' },
    { studioCode: 'recycler_info', runtimeCodes: ['recycler_info', 'info_recycler'], renderer: 'info', availability: 'ready' },
    { studioCode: 'recycler_prizes', runtimeCodes: ['recycler_prizes'], renderer: 'recyclerPrizes', availability: 'ready' },
    { studioCode: 'info_loyalty', runtimeCodes: ['info_loyalty'], renderer: 'infoLoyalty', availability: 'ready' },
    { studioCode: 'info_duckets', runtimeCodes: ['info_duckets'], renderer: 'info', availability: 'ready' },
    { studioCode: 'info_rentables', runtimeCodes: ['info_rentables'], renderer: 'infoRentables', availability: 'ready' },
    { studioCode: 'info_pets', runtimeCodes: ['info_pets'], renderer: 'info', availability: 'ready' },
    { studioCode: 'info_pets2', runtimeCodes: ['info_pets2'], renderer: 'pets2', availability: 'ready' },
    { studioCode: 'info_pets3', runtimeCodes: ['info_pets3'], renderer: 'pets3', availability: 'ready' },
    { studioCode: 'loyalty_vip_buy', runtimeCodes: ['loyalty_vip_buy'], renderer: 'info', availability: 'ready' },
    { studioCode: 'badge_display', runtimeCodes: ['badge_display'], renderer: 'badgeDisplay', availability: 'ready' },
    { studioCode: 'bots', runtimeCodes: ['bots'], renderer: 'default', availability: 'ready' },
    { studioCode: 'single_bundle', runtimeCodes: ['single_bundle'], renderer: 'singleBundle', availability: 'ready' },
    { studioCode: 'sold_ltd_items', runtimeCodes: ['sold_ltd_items'], renderer: 'soldLimited', availability: 'ready' },
    { studioCode: 'plasto', runtimeCodes: ['plasto'], renderer: 'default', availability: 'ready' },
    { studioCode: 'default_3x3_color_grouping', runtimeCodes: ['default_3x3_color_grouping'], renderer: 'colorGrouping', availability: 'ready' },
    { studioCode: 'recent_purchases', runtimeCodes: ['recent_purchases'], renderer: 'default', availability: 'ready' },
    { studioCode: 'room_bundle', runtimeCodes: ['room_bundle'], renderer: 'roomBundle', availability: 'ready' },
    { studioCode: 'petcustomization', runtimeCodes: ['petcustomization'], renderer: 'petCustomization', availability: 'ready' },
    { studioCode: 'frontpage_featured', runtimeCodes: ['frontpage_featured'], renderer: 'frontpage', availability: 'ready' },
    { studioCode: 'root', runtimeCodes: ['root'], renderer: 'default', availability: 'ready' },
    { studioCode: 'monkey', runtimeCodes: ['monkey'], renderer: 'info', availability: 'ready' },
    { studioCode: 'niko', runtimeCodes: ['niko'], renderer: 'info', availability: 'ready' },
    { studioCode: 'mad_money', runtimeCodes: ['mad_money'], renderer: 'info', availability: 'ready' },
    { studioCode: 'productpage1', runtimeCodes: ['productpage1'], renderer: 'default', availability: 'ready' },
    { studioCode: 'collectibles', runtimeCodes: ['collectibles'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['default_3x3_extrainfo'], renderer: 'default', availability: 'ready' },
    { runtimeCodes: ['pixeleffects'], renderer: 'info', availability: 'ready' }
] as const satisfies readonly CatalogLayoutDefinition[];

type CatalogLayoutRegistryEntry = (typeof CATALOG_LAYOUT_REGISTRY)[number];

export type CatalogStudioLayoutCode = CatalogLayoutRegistryEntry extends infer Definition
    ? Definition extends { readonly studioCode: infer Code extends string }
        ? Code
        : never
    : never;

const hasStudioCode = (definition: CatalogLayoutDefinition): definition is CatalogLayoutDefinition & { studioCode: CatalogStudioLayoutCode } =>
    typeof definition.studioCode === 'string';

export const CATALOG_STUDIO_LAYOUT_CODES = (CATALOG_LAYOUT_REGISTRY as readonly CatalogLayoutDefinition[])
    .filter(hasStudioCode)
    .map((definition) => definition.studioCode);

const runtimeDefinitions = new Map<string, CatalogLayoutDefinition>();

for (const definition of CATALOG_LAYOUT_REGISTRY) {
    for (const runtimeCode of definition.runtimeCodes) {
        const current = runtimeDefinitions.get(runtimeCode);

        if (current && current.renderer !== definition.renderer) {
            throw new Error(`Catalog layout ${runtimeCode} has conflicting renderers.`);
        }

        runtimeDefinitions.set(runtimeCode, definition);
    }
}

const studioCodes = new Set<string>(CATALOG_STUDIO_LAYOUT_CODES);

export const getCatalogLayoutDefinition = (runtimeCode: string): CatalogLayoutDefinition | null => runtimeDefinitions.get(runtimeCode) ?? null;

export const isCatalogStudioLayoutCode = (value: string): value is CatalogStudioLayoutCode => studioCodes.has(value);

const READ_ONLY_ADMIN_LAYOUTS = new Set<string>(['recent_purchases']);

export const isReadOnlyCatalogAdminLayout = (layout: string | null | undefined): boolean =>
    typeof layout === 'string' && READ_ONLY_ADMIN_LAYOUTS.has(layout);
