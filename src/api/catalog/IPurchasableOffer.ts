import { ICatalogPage } from './ICatalogPage';
import { IProduct } from './IProduct';

export interface IPurchasableOffer {
    activate(): void;
    clubLevel: number;
    page: ICatalogPage;
    offerId: number;
    localizationId: string;
    priceInCredits: number;
    priceInActivityPoints: number;
    activityPointType: number;
    giftable: boolean;
    product: IProduct;
    pricingModel: string;
    priceType: string;
    bundlePurchaseAllowed: boolean;
    isRentOffer: boolean;
    badgeCode: string;
    chatStyleId?: string;
    isChatStyleOffer?: boolean;
    localizationName: string;
    localizationDescription: string;
    isLazy: boolean;
    products: IProduct[];
    itemIds: string;
    haveOffer: boolean;
    clone?(): IPurchasableOffer;
}
