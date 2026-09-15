import { GetSessionDataManager, IFurnitureData } from '@octane/renderer';
import { LocalizeText } from '../utils';
import { FurniCategory } from './FurniCategory';
import { GroupItem } from './GroupItem';

export const FURNI_MAIN_FILTER = {
    ALL: 'all',
    FLOOR: 'floor_items',
    WALL: 'wall_items',
    ROOM_LAYOUT: 'room_layout'
} as const;

export type FurniMainFilter = (typeof FURNI_MAIN_FILTER)[keyof typeof FURNI_MAIN_FILTER];

export const FURNI_TYPE_OPTIONS: Record<FurniMainFilter, string[]> = {
    all: ['any', 'sittable', 'layable', 'tiles_or_rugs', 'ltd', 'wired', 'credit_furni', 'clothes', 'pet_food', 'tradable', 'non_tradable', 'recyclable'],
    floor_items: [
        'any',
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
    ],
    wall_items: ['any', 'windows', 'dimmers', 'stickies', 'paintings', 'tradable', 'non_tradable', 'recyclable'],
    room_layout: ['any', 'floors', 'wallpapers', 'landscape']
};

export const furniMainFilterKey = (id: string) => `inventory.furni.filter.main.${id}`;
export const furniTypeFilterKey = (id: string) => `inventory.furni.filter.type.${id}`;

const isRoomLayoutCategory = (category: number) =>
    category === FurniCategory.WALL_PAPER || category === FurniCategory.FLOOR || category === FurniCategory.LANDSCAPE;

const getFurniData = (item: GroupItem): IFurnitureData => {
    const session = GetSessionDataManager();
    if (!session || item.type < 0) return null;

    return item.isWallItem ? session.getWallItemData(item.type) : session.getFloorItemData(item.type);
};

const matchesMainFilter = (item: GroupItem, main: FurniMainFilter): boolean => {
    switch (main) {
        case FURNI_MAIN_FILTER.FLOOR:
            return !item.isWallItem;
        case FURNI_MAIN_FILTER.WALL:
            return item.isWallItem && !isRoomLayoutCategory(item.category);
        case FURNI_MAIN_FILTER.ROOM_LAYOUT:
            return isRoomLayoutCategory(item.category);
        default:
            return true;
    }
};

const matchesTypeFilter = (item: GroupItem, typeId: string): boolean => {
    if (!typeId || typeId === 'any') return true;

    const last = item.getLastItem();
    const data = getFurniData(item);
    const className = data?.className ?? '';
    const category = data?.category ?? '';
    const furniLine = data?.furniLine ?? '';

    switch (typeId) {
        case 'sittable':
            return !!data?.canSitOn;
        case 'layable':
            return !!data?.canLayOn;
        case 'tiles_or_rugs':
            if (!data || className.startsWith('tile_walkmagic') || className === 'hole' || !data.canPutStuffOn) return false;
            if (category === 'rug' || category === 'floor' || className.startsWith('carpet')) return true;

            // tileSizeZ is not AIR's height: legacy Renderer loaders set it to 0.
            return data.height !== undefined && data.height <= 0.2 && data.canStandOn && data.tileSizeX > 1 && data.tileSizeY > 1;
        case 'ltd':
            return (last?.stuffData?.uniqueNumber ?? 0) > 0;
        case 'wired':
            return className.startsWith('wf_') || category.startsWith('wired_');
        case 'credit_furni':
            return item.category === FurniCategory.CREDIT_FURNI || className.startsWith('CF_');
        case 'clothes':
            return item.category === FurniCategory.FIGURE_PURCHASABLE_SET;
        case 'pet_food':
            return className.startsWith('petfood') || furniLine === 'pet_food';
        case 'tradable':
            return data?.tradeable ?? !!last?.isTradable;
        case 'non_tradable':
            return data?.tradeable !== undefined ? !data.tradeable : !!last && !last.isTradable;
        case 'recyclable':
            return !!last?.recyclable;
        case 'windows':
            return className.startsWith('window_') || furniLine === 'windows' || category === 'window';
        case 'dimmers':
            return className.startsWith('dimmer_') || category === 'dimmer' || furniLine === 'dimmers';
        case 'stickies':
            return item.category === FurniCategory.POST_IT;
        case 'paintings':
            return className.startsWith('diamond_painting');
        case 'floors':
            return item.category === FurniCategory.FLOOR;
        case 'wallpapers':
            return item.category === FurniCategory.WALL_PAPER;
        case 'landscape':
            return item.category === FurniCategory.LANDSCAPE;
        default:
            return true;
    }
};

const getDescription = (item: GroupItem): string => {
    if (item.description) return item.description;

    let key: string;

    switch (item.category) {
        case FurniCategory.WALL_PAPER:
            key = 'inventory.furni.item.wallpaper.desc';
            break;
        case FurniCategory.FLOOR:
            key = 'inventory.furni.item.floor.desc';
            break;
        case FurniCategory.LANDSCAPE:
            key = 'inventory.furni.item.landscape.desc';
            break;
        case FurniCategory.POSTER:
            key = `poster_${item.getLastItem()?.stuffData?.getLegacyString()}_desc`;
            break;
        case FurniCategory.TRAX_SONG:
            // AIR obtains song creator from music-controller metadata, which is
            // not exposed by Octane GroupItem yet.
            return '';
        default:
            key = `${item.isWallItem ? 'wallItem' : 'roomItem'}.desc.${item.type}`;
    }

    const localized = LocalizeText(key);

    return localized === key ? (getFurniData(item)?.description ?? '') : localized;
};

export const filterFurnitureGroupItems = (groupItems: GroupItem[], searchValue: string, mainFilter: FurniMainFilter, typeFilter: string): GroupItem[] => {
    const comparison = searchValue.toLowerCase();

    return groupItems.filter((item) => {
        if (!matchesMainFilter(item, mainFilter)) return false;
        if (!matchesTypeFilter(item, typeFilter)) return false;
        if (!comparison.length) return true;

        const name = item.name ?? '';
        const description = getDescription(item);
        const chestName = item.stuffData?.chestName ?? '';

        return [name, description, chestName].some((value) => value.toLowerCase().includes(comparison));
    });
};
