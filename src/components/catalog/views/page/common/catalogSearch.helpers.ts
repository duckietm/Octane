import { IFurnitureData } from '@octane/renderer';
import { CatalogType } from '../../../../../api';

export const CATALOG_SEARCH_MIN_LENGTH = 3;
export const CATALOG_SEARCH_DEBOUNCE_MS = 50;
export const CATALOG_SEARCH_RESULT_LIMIT = 400;

export const normalizeCatalogSearchText = (value: string): string =>
    (value || '')
        .toLocaleLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

export const shouldRunCatalogSearch = (value: string): boolean => normalizeCatalogSearchText(value).length >= CATALOG_SEARCH_MIN_LENGTH;

export const isCatalogSearchEnterKey = (key: string, value: string): boolean => key === 'Enter' && shouldRunCatalogSearch(value);

const getFurnitureSearchText = (furniture: IFurnitureData): string =>
    normalizeCatalogSearchText([furniture.name, furniture.description, furniture.className, furniture.furniLine].filter((value) => !!value).join(' '));

export const findCatalogFurnitureMatches = (
    furnitureDatas: IFurnitureData[],
    query: string,
    catalogType: string,
    limit: number = CATALOG_SEARCH_RESULT_LIMIT
): { furniture: IFurnitureData[]; furniLines: string[] } => {
    const normalizedQuery = normalizeCatalogSearchText(query);
    const furniture: IFurnitureData[] = [];
    const furniLines = new Set<string>();

    if (!normalizedQuery || !furnitureDatas?.length) return { furniture, furniLines: [] };

    for (const item of furnitureDatas) {
        if (!item) continue;
        if (catalogType === CatalogType.BUILDER && !item.availableForBuildersClub) continue;
        if (catalogType === CatalogType.NORMAL && item.excludeDynamic) continue;
        if (!getFurnitureSearchText(item).includes(normalizedQuery)) continue;

        if (item.furniLine) furniLines.add(item.furniLine);

        const isBuyable = item.purchaseOfferId > -1 || item.rentOfferId > -1;

        if (isBuyable && furniture.length < limit) furniture.push(item);
    }

    return { furniture, furniLines: [...furniLines] };
};
