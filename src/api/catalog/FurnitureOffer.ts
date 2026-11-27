import { GetProductOfferComposer, IFurnitureData } from '@octane/renderer';
import { GetProductDataForLocalization, SendMessageComposer } from '../octane';
import { ICatalogPage } from './ICatalogPage';
import { IProduct } from './IProduct';
import { IPurchasableOffer } from './IPurchasableOffer';
import { Offer } from './Offer';
import { Product } from './Product';

export class FurnitureOffer implements IPurchasableOffer {
    private _furniData: IFurnitureData;
    private _page: ICatalogPage;
    private _product: IProduct;
    private _offerId: number;
    private _isRent: boolean;

    // AIR FurnitureOffer: the offer the search found (HabboCatalog.createSearchResultOffer), rent only when that is what is sold.
    constructor(furniData: IFurnitureData, offerId?: number, isRent?: boolean) {
        this._furniData = furniData;
        this._isRent = isRent ?? (furniData.purchaseOfferId === -1 && furniData.rentOfferId > -1);
        this._offerId = offerId ?? (this._isRent ? furniData.rentOfferId : furniData.purchaseOfferId);
        this._product = new Product(
            this._furniData.type,
            this._furniData.id,
            this._furniData.customParams,
            1,
            GetProductDataForLocalization(this._furniData.className),
            this._furniData
        );
    }

    public activate(): void {
        SendMessageComposer(new GetProductOfferComposer(this._offerId));
    }

    public get offerId(): number {
        return this._offerId;
    }

    public get priceInActivityPoints(): number {
        return 0;
    }

    public get activityPointType(): number {
        return 0;
    }

    public get priceInCredits(): number {
        return 0;
    }

    public get page(): ICatalogPage {
        return this._page;
    }

    public set page(page: ICatalogPage) {
        this._page = page;
    }

    public get priceType(): string {
        return '';
    }

    public get product(): IProduct {
        return this._product;
    }

    public get products(): IProduct[] {
        return [this._product];
    }

    public get localizationId(): string {
        return 'roomItem.name.' + this._furniData.id;
    }

    public get bundlePurchaseAllowed(): boolean {
        return false;
    }

    public get isRentOffer(): boolean {
        return this._isRent;
    }

    public get giftable(): boolean {
        return false;
    }

    public get pricingModel(): string {
        return Offer.PRICING_MODEL_FURNITURE;
    }

    public get clubLevel(): number {
        return 0;
    }

    public get badgeCode(): string {
        return '';
    }

    public get localizationName(): string {
        return this._furniData?.name ?? '';
    }

    // AIR FurnitureDataParser passes an empty description (FurnitureDataParser.as:257), so search results show none.
    public get localizationDescription(): string {
        return '';
    }

    public get isLazy(): boolean {
        return true;
    }

    public get itemIds(): string {
        return String(this._furniData?.id ?? '');
    }

    public get haveOffer(): boolean {
        return false;
    }
}
