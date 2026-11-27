import { GetFurnitureData, GetProductDataForLocalization, LocalizeText, ProductTypeEnum } from '..';
import { ICatalogPage } from './ICatalogPage';
import { IProduct } from './IProduct';
import { IPurchasableOffer } from './IPurchasableOffer';
import { Product } from './Product';

export class Offer implements IPurchasableOffer {
    public static PRICING_MODEL_UNKNOWN: string = 'pricing_model_unknown';
    public static PRICING_MODEL_SINGLE: string = 'pricing_model_single';
    public static PRICING_MODEL_MULTI: string = 'pricing_model_multi';
    public static PRICING_MODEL_BUNDLE: string = 'pricing_model_bundle';
    public static PRICING_MODEL_FURNITURE: string = 'pricing_model_furniture';
    public static PRICE_TYPE_NONE: string = 'price_type_none';
    public static PRICE_TYPE_CREDITS: string = 'price_type_credits';
    public static PRICE_TYPE_ACTIVITYPOINTS: string = 'price_type_activitypoints';
    public static PRICE_TYPE_CREDITS_ACTIVITYPOINTS: string = 'price_type_credits_and_activitypoints';

    private _pricingModel: string;
    private _priceType: string;
    private _offerId: number;
    private _localizationId: string;
    private _priceInCredits: number;
    private _priceInActivityPoints: number;
    private _activityPointType: number;
    private _giftable: boolean;
    private _isRentOffer: boolean;
    private _page: ICatalogPage;
    private _clubLevel: number = 0;
    private _products: IProduct[];
    private _badgeCode: string;
    private _chatStyleId: string = null;
    private _isChatStyleOffer: boolean = false;
    private _bundlePurchaseAllowed: boolean = false;
    private _itemIds: string = '';
    private _haveOffer: boolean = false;

    constructor(
        offerId: number,
        localizationId: string,
        isRentOffer: boolean,
        priceInCredits: number,
        priceInActivityPoints: number,
        activityPointType: number,
        giftable: boolean,
        clubLevel: number,
        products: IProduct[],
        bundlePurchaseAllowed: boolean,
        itemIds: string = '',
        haveOffer: boolean = false
    ) {
        this._offerId = offerId;
        this._localizationId = localizationId;
        this._isRentOffer = isRentOffer;
        this._priceInCredits = priceInCredits;
        this._priceInActivityPoints = priceInActivityPoints;
        this._activityPointType = activityPointType;
        this._giftable = giftable;
        this._clubLevel = clubLevel;
        this._products = products;
        this._bundlePurchaseAllowed = bundlePurchaseAllowed;
        this._itemIds = itemIds || '';
        this._haveOffer = haveOffer;
        this._isChatStyleOffer = Offer.isChatStyleOnly(products);

        this.setPricingModelForProducts();
        this.setPricingType();

        // AIR Offer: the first badge wins; a chat style that comes with other products is
        // shown as an add-on next to the preview (catalogue_chatstyle_background).
        for (const product of products) {
            if (product.productType === ProductTypeEnum.BADGE) {
                this._badgeCode = product.extraParam;

                break;
            }

            if (!this._isChatStyleOffer && product.productType === ProductTypeEnum.CHAT_STYLE) {
                this._chatStyleId = product.extraParam;

                break;
            }
        }
    }

    /** AIR Offer: a chat style alone, or a chat style together with a badge, is sold as one product. */
    public static isChatStyleOnly(products: IProduct[]): boolean {
        if (!products) return false;

        if (products.length === 1) return products[0].productType === ProductTypeEnum.CHAT_STYLE;

        if (products.length === 2) {
            const types = products.map((product) => product.productType);

            return types.includes(ProductTypeEnum.CHAT_STYLE) && types.includes(ProductTypeEnum.BADGE);
        }

        return false;
    }

    public activate(): void {}

    public get clubLevel(): number {
        return this._clubLevel;
    }

    public get page(): ICatalogPage {
        return this._page;
    }

    public set page(k: ICatalogPage) {
        this._page = k;
    }

    public get offerId(): number {
        return this._offerId;
    }

    public get localizationId(): string {
        return this._localizationId;
    }

    public get priceInCredits(): number {
        return this._priceInCredits;
    }

    public get priceInActivityPoints(): number {
        return this._priceInActivityPoints;
    }

    public get activityPointType(): number {
        return this._activityPointType;
    }

    public get giftable(): boolean {
        return this._giftable;
    }

    public get product(): IProduct {
        if (!this._products || !this._products.length) return null;

        if (this._products.length === 1) return this._products[0];

        if (this._isChatStyleOffer) return this._products.find((product) => product.productType === ProductTypeEnum.CHAT_STYLE) ?? null;

        const products = Product.stripAddonProducts(this._products);

        if (products.length) return products[0];

        return null;
    }

    public get pricingModel(): string {
        return this._pricingModel;
    }

    public get priceType(): string {
        return this._priceType;
    }

    public get bundlePurchaseAllowed(): boolean {
        return this._bundlePurchaseAllowed;
    }

    public get isRentOffer(): boolean {
        return this._isRentOffer;
    }

    public get badgeCode(): string {
        return this._badgeCode;
    }

    /** The chat style sold as an add-on next to other products, or null. */
    public get chatStyleId(): string {
        return this._chatStyleId;
    }

    public get isChatStyleOffer(): boolean {
        return this._isChatStyleOffer;
    }

    public get localizationName(): string {
        const furnitureProduct = this.product;

        if (furnitureProduct?.furnitureData?.name?.length) return furnitureProduct.furnitureData.name;

        const productData = GetProductDataForLocalization(this._localizationId);

        if (productData) return productData.name;

        return LocalizeText(this._localizationId);
    }

    public get localizationDescription(): string {
        const furnitureProduct = this.product;

        if (furnitureProduct?.furnitureData?.description?.length) return furnitureProduct.furnitureData.description;

        const productData = GetProductDataForLocalization(this._localizationId);

        if (productData) return productData.description;

        return LocalizeText(this._localizationId);
    }

    public get isLazy(): boolean {
        return false;
    }

    public get products(): IProduct[] {
        return this._products;
    }

    public get itemIds(): string {
        return this._itemIds;
    }

    public get haveOffer(): boolean {
        return this._haveOffer;
    }

    private setPricingModelForProducts(): void {
        if (this._isChatStyleOffer) {
            this._pricingModel = Offer.PRICING_MODEL_SINGLE;

            return;
        }

        const products = Product.stripAddonProducts(this._products);

        if (products.length === 1) {
            if (products[0].productCount === 1) {
                this._pricingModel = Offer.PRICING_MODEL_SINGLE;
            } else {
                this._pricingModel = Offer.PRICING_MODEL_MULTI;
            }
        } else if (products.length > 1) {
            this._pricingModel = Offer.PRICING_MODEL_BUNDLE;
        } else {
            this._pricingModel = Offer.PRICING_MODEL_UNKNOWN;
        }
    }

    private setPricingType(): void {
        if (this._priceInCredits > 0 && this._priceInActivityPoints > 0) {
            this._priceType = Offer.PRICE_TYPE_CREDITS_ACTIVITYPOINTS;
        } else if (this._priceInCredits > 0) {
            this._priceType = Offer.PRICE_TYPE_CREDITS;
        } else if (this._priceInActivityPoints > 0) {
            this._priceType = Offer.PRICE_TYPE_ACTIVITYPOINTS;
        } else {
            this._priceType = Offer.PRICE_TYPE_NONE;
        }
    }

    public clone(): IPurchasableOffer {
        const products: IProduct[] = [];
        const productData = GetProductDataForLocalization(this.localizationId);

        for (const product of this._products) {
            const furnitureData = GetFurnitureData(product.productClassId, product.productType);

            products.push(new Product(product.productType, product.productClassId, product.extraParam, product.productCount, productData, furnitureData));
        }

        const offer = new Offer(
            this.offerId,
            this.localizationId,
            this.isRentOffer,
            this.priceInCredits,
            this.priceInActivityPoints,
            this.activityPointType,
            this.giftable,
            this.clubLevel,
            products,
            this.bundlePurchaseAllowed,
            this.itemIds,
            this.haveOffer
        );

        offer.page = this.page;

        return offer;
    }
}
