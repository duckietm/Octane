import { GetSessionDataManager, IFurnitureData } from '@octane/renderer';
import { FurniCategory, GroupItem, localizeWithFallback } from '../../../../api';

// Mirrors the official FurniView main/type filter ids (AIR 13 inventory/furni/FurniView.as and
// the FurniGridView passMainFilter/passTypeFilter pair) so the same vocabulary can be localized
// with the official `inventory.furni.filter.*` keys.
export const MAIN_FILTER_ALL = 'all';
export const MAIN_FILTER_FLOOR = 'floor_items';
export const MAIN_FILTER_WALL = 'wall_items';
export const MAIN_FILTER_ROOM_LAYOUT = 'room_layout';

export const TYPE_FILTER_ANY = 'any';

export const INVENTORY_MAIN_FILTER_IDS = [MAIN_FILTER_ALL, MAIN_FILTER_FLOOR, MAIN_FILTER_WALL, MAIN_FILTER_ROOM_LAYOUT];

// "collectibles" is left out of every list: the official client keys it on NFT data that the
// inventory packets we receive do not carry, so the option could never match anything.
const FLOOR_TYPE_FILTER_IDS = [
    TYPE_FILTER_ANY,
    'sittable',
    'layable',
    'tiles_or_rugs',
    'ltd',
    'wired',
    'credit_furni',
    'clothes',
    'pet_food',
    'tradable',
    'non_tradable',
    'recyclable'
];
const WALL_TYPE_FILTER_IDS = [TYPE_FILTER_ANY, 'windows', 'dimmers', 'stickies', 'paintings', 'tradable', 'non_tradable', 'recyclable'];
const ROOM_LAYOUT_TYPE_FILTER_IDS = [TYPE_FILTER_ANY, 'floors', 'wallpapers', 'landscape'];

const MAIN_FILTER_FALLBACKS: Record<string, string> = {
    [MAIN_FILTER_ALL]: 'All',
    [MAIN_FILTER_FLOOR]: 'Floor items',
    [MAIN_FILTER_WALL]: 'Wall items',
    [MAIN_FILTER_ROOM_LAYOUT]: 'Room layout'
};

const TYPE_FILTER_FALLBACKS: Record<string, string> = {
    [TYPE_FILTER_ANY]: 'Any type',
    sittable: 'Sittable',
    layable: 'Layable',
    tiles_or_rugs: 'Tiles and rugs',
    ltd: 'LTD',
    wired: 'Wired',
    credit_furni: 'Credit furni',
    clothes: 'Clothes',
    pet_food: 'Pet food',
    tradable: 'Tradable',
    non_tradable: 'Non-tradable',
    recyclable: 'Recyclable',
    windows: 'Windows',
    dimmers: 'Dimmers',
    stickies: 'Stickies',
    paintings: 'Paintings',
    floors: 'Floors',
    wallpapers: 'Wallpapers',
    landscape: 'Landscapes'
};

export const getInventoryTypeFilterIds = (mainFilter: string): string[] => {
    switch (mainFilter) {
        case MAIN_FILTER_WALL:
            return WALL_TYPE_FILTER_IDS;
        case MAIN_FILTER_ROOM_LAYOUT:
            return ROOM_LAYOUT_TYPE_FILTER_IDS;
        case MAIN_FILTER_ALL:
        case MAIN_FILTER_FLOOR:
            return FLOOR_TYPE_FILTER_IDS;
        default:
            return [TYPE_FILTER_ANY];
    }
};

export const getInventoryMainFilterLabel = (id: string): string => localizeWithFallback(`inventory.furni.filter.main.${id}`, MAIN_FILTER_FALLBACKS[id] ?? id);

export const getInventoryTypeFilterLabel = (id: string): string => localizeWithFallback(`inventory.furni.filter.type.${id}`, TYPE_FILTER_FALLBACKS[id] ?? id);

const getFurniData = (item: GroupItem): IFurnitureData => {
    if (!item) return null;

    const manager = GetSessionDataManager();

    if (!manager) return null;

    return item.isWallItem ? manager.getWallItemData(item.type) : manager.getFloorItemData(item.type);
};

const hasCategory = (item: GroupItem, ...categories: number[]) => categories.indexOf(item.category) >= 0;

const getClassName = (item: GroupItem) => getFurniData(item)?.className ?? '';

export const isRoomLayoutItem = (item: GroupItem) => hasCategory(item, FurniCategory.WALL_PAPER, FurniCategory.FLOOR, FurniCategory.LANDSCAPE);

const isTilesOrRugs = (data: IFurnitureData) => {
    if (!data) return false;

    // Magic tiles and holes stack like rugs but are teleport/game furni in the official list.
    if (data.className.startsWith('tile_walkmagic') || data.className === 'hole') return false;

    if (!data.allowStack) return false;

    if (data.category === 'rug' || data.category === 'floor') return true;

    if (data.className.startsWith('carpet')) return true;

    if (data.tileSizeZ > 0.2 || !data.canStandOn || data.tileSizeX <= 1 || data.tileSizeY <= 1) return false;

    return true;
};

export const passInventoryMainFilter = (item: GroupItem, mainFilter: string): boolean => {
    switch (mainFilter) {
        case MAIN_FILTER_FLOOR:
            return !item.isWallItem;
        case MAIN_FILTER_WALL:
            return item.isWallItem && !isRoomLayoutItem(item);
        case MAIN_FILTER_ROOM_LAYOUT:
            return isRoomLayoutItem(item);
        default:
            return true;
    }
};

export const passInventoryTypeFilter = (item: GroupItem, typeFilter: string): boolean => {
    const firstItem = item.getItemByIndex(0) ?? null;

    switch (typeFilter) {
        case TYPE_FILTER_ANY:
            return true;
        case 'sittable':
            return !!getFurniData(item)?.canSitOn;
        case 'layable':
            return !!getFurniData(item)?.canLayOn;
        case 'tiles_or_rugs':
            return isTilesOrRugs(getFurniData(item));
        case 'ltd':
            return !!item.stuffData && item.stuffData.uniqueNumber > 0;
        case 'wired': {
            const data = getFurniData(item);

            return !!data && (data.className.startsWith('wf_') || (data.category ?? '').startsWith('wired_'));
        }
        case 'credit_furni':
            return hasCategory(item, FurniCategory.CREDIT_FURNI) || getClassName(item).startsWith('CF_');
        case 'clothes':
            return hasCategory(item, FurniCategory.FIGURE_PURCHASABLE_SET);
        case 'pet_food': {
            const data = getFurniData(item);

            return !!data && (data.className.startsWith('petfood') || data.furniLine === 'pet_food');
        }
        case 'tradable':
            return !!firstItem?.isTradable;
        case 'non_tradable':
            return !!firstItem && !firstItem.isTradable;
        case 'recyclable':
            return !!firstItem?.recyclable;
        case 'windows': {
            const data = getFurniData(item);

            return !!data && (data.className.startsWith('window_') || data.furniLine === 'windows' || data.category === 'window');
        }
        case 'dimmers': {
            const data = getFurniData(item);

            return !!data && (data.className.startsWith('dimmer_') || data.category === 'dimmer' || data.furniLine === 'dimmers');
        }
        case 'stickies':
            return hasCategory(item, FurniCategory.POST_IT);
        case 'paintings':
            return getClassName(item).startsWith('diamond_painting');
        case 'floors':
            return hasCategory(item, FurniCategory.FLOOR);
        case 'wallpapers':
            return hasCategory(item, FurniCategory.WALL_PAPER);
        case 'landscape':
            return hasCategory(item, FurniCategory.LANDSCAPE);
        default:
            return true;
    }
};

export const passInventorySearch = (item: GroupItem, search: string): boolean => {
    if (!search) return true;

    const comparison = search.toLocaleLowerCase();
    const name = (item.name ?? '').toLocaleLowerCase();
    const description = (item.description ?? '').toLocaleLowerCase();

    return name.includes(comparison) || (description.length > 0 && description.includes(comparison));
};

export const filterInventoryGroupItems = (items: GroupItem[], mainFilter: string, typeFilter: string, search: string): GroupItem[] =>
    items.filter((item) => passInventoryMainFilter(item, mainFilter) && passInventoryTypeFilter(item, typeFilter) && passInventorySearch(item, search));
