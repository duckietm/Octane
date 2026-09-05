import { GetRoomEngine, SellablePetPaletteData } from '@octane/renderer';
import { GetConfigurationValue } from '../octane';
import { ICatalogNode } from './ICatalogNode';
import { IProduct } from './IProduct';
import { IPurchasableOffer } from './IPurchasableOffer';
import { ProductTypeEnum } from './ProductTypeEnum';

export const GetPixelEffectIcon = (id: number) => {
    return '';
};

export const GetProductIconUrl = (product: IProduct, offer: IPurchasableOffer = null): string => {
    if (!product) return null;

    if (product.productType === ProductTypeEnum.FLOOR || product.productType === ProductTypeEnum.WALL) {
        const className = product.furnitureData?.className;

        if (className?.length) {
            let param = '';

            if (product.productType === ProductTypeEnum.WALL && product.extraParam?.length) param = `_${product.extraParam}`;
            else if (product.productType === ProductTypeEnum.FLOOR && product.furnitureData?.hasIndexedColor && product.furnitureData.colorIndex > 0) {
                param = `_${product.furnitureData.colorIndex}`;
            }

            const configuredIconUrl = GetConfigurationValue<string>('furni.asset.icon.url', '');

            if (configuredIconUrl?.length) return configuredIconUrl.replace('%libname%', className).replace('%param%', param);
        }
    }

    return typeof product.getIconUrl === 'function' ? (product.getIconUrl(offer) ?? null) : null;
};

export const GetSubscriptionProductIcon = (id: number) => {
    return '';
};

export const GetOfferNodes = (offerNodes: Map<number, ICatalogNode[]>, offerId: number) => {
    if (!offerNodes) return [];

    const nodes = offerNodes.get(offerId);
    const allowedNodes: ICatalogNode[] = [];

    if (nodes && nodes.length) {
        for (const node of nodes) {
            if (!node || !node.isVisible) continue;

            allowedNodes.push(node);
        }
    }

    return allowedNodes;
};

export const FilterCatalogNode = (search: string, furniLines: string[], node: ICatalogNode, nodes: ICatalogNode[]) => {
    if (!node) return;

    if (node.isVisible && node.pageId > 0) {
        let nodeAdded = false;

        const hayStack = [node.pageName, node.localization].join(' ').toLowerCase().replace(/ /gi, '');

        if (hayStack.indexOf(search) > -1) {
            nodes.push(node);

            nodeAdded = true;
        }

        if (!nodeAdded) {
            for (const furniLine of furniLines) {
                if (hayStack.indexOf(furniLine) >= 0) {
                    nodes.push(node);

                    break;
                }
            }
        }
    }

    for (const child of node.children) FilterCatalogNode(search, furniLines, child, nodes);
};

export function GetPetIndexFromLocalization(localization: string) {
    if (!localization.length) return 0;

    let index = localization.length - 1;

    while (index >= 0) {
        if (isNaN(parseInt(localization.charAt(index)))) break;

        index--;
    }

    if (index > 0) return parseInt(localization.substring(index + 1));

    return -1;
}

export function GetPetAvailableColors(petIndex: number, palettes: SellablePetPaletteData[]): number[][] {
    switch (petIndex) {
        case 0:
            return [
                [16743226],
                [16750435],
                [16764339],
                [0xf59500],
                [16498012],
                [16704690],
                [0xedd400],
                [16115545],
                [16513201],
                [8694111],
                [11585939],
                [14413767],
                [6664599],
                [9553845],
                [12971486],
                [8358322],
                [10002885],
                [13292268],
                [10780600],
                [12623573],
                [14403561],
                [12418717],
                [14327229],
                [15517403],
                [14515069],
                [15764368],
                [16366271],
                [0xababab],
                [0xd4d4d4],
                [0xffffff],
                [14256481],
                [14656129],
                [15848130],
                [14005087],
                [14337152],
                [15918540],
                [15118118],
                [15531929],
                [9764857],
                [11258085]
            ];
        case 1:
            return [
                [16743226],
                [16750435],
                [16764339],
                [0xf59500],
                [16498012],
                [16704690],
                [0xedd400],
                [16115545],
                [16513201],
                [8694111],
                [11585939],
                [14413767],
                [6664599],
                [9553845],
                [12971486],
                [8358322],
                [10002885],
                [13292268],
                [10780600],
                [12623573],
                [14403561],
                [12418717],
                [14327229],
                [15517403],
                [14515069],
                [15764368],
                [16366271],
                [0xababab],
                [0xd4d4d4],
                [0xffffff],
                [14256481],
                [14656129],
                [15848130],
                [14005087],
                [14337152],
                [15918540],
                [15118118],
                [15531929],
                [9764857],
                [11258085]
            ];
        case 2:
            return [
                [16579283],
                [15378351],
                [8830016],
                [15257125],
                [9340985],
                [8949607],
                [6198292],
                [8703620],
                [9889626],
                [8972045],
                [12161285],
                [13162269],
                [8620113],
                [12616503],
                [8628101],
                [0xd2ff00],
                [9764857]
            ];
        case 3:
            return [[0xffffff], [0xeeeeee], [0xdddddd]];
        case 4:
            return [[0xffffff], [16053490], [15464440], [16248792], [15396319], [15007487]];
        case 5:
            return [[0xffffff], [0xeeeeee], [0xdddddd]];
        case 6:
            return [[0xffffff], [0xeeeeee], [0xdddddd], [16767177], [16770205], [16751331]];
        case 7:
            return [[0xcccccc], [0xaeaeae], [16751331], [10149119], [16763290], [16743786]];
        default: {
            const colors: number[][] = [];

            for (const palette of palettes) {
                const petColorResult = GetRoomEngine().getPetColorResult(petIndex, palette.paletteId);

                if (!petColorResult) continue;

                if (petColorResult.primaryColor === petColorResult.secondaryColor) {
                    colors.push([petColorResult.primaryColor]);
                } else {
                    colors.push([petColorResult.primaryColor, petColorResult.secondaryColor]);
                }
            }

            return colors;
        }
    }
}
