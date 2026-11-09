import { IObjectData } from '@octane/renderer';

export class MarketplaceOfferData {
    public static readonly TYPE_FLOOR: number = 1;
    public static readonly TYPE_WALL: number = 2;
    /** AIR's offer type of a collectible: an nft_* furni sold for emeralds. */
    public static readonly TYPE_NFT: number = 5;

    private _offerId: number;
    private _furniId: number;
    private _furniType: number;
    private _extraData: string;
    private _stuffData: IObjectData;
    private _price: number;
    private _averagePrice: number;
    private _imageCallback: number;
    private _status: number;
    private _timeLeftMinutes: number = -1;
    private _offerCount: number;
    private _image: string;
    private _productCode: string;
    private _nftFurniType: number;

    constructor(
        offerId: number,
        furniId: number,
        furniType: number,
        extraData: string,
        stuffData: IObjectData,
        price: number,
        status: number,
        averagePrice: number,
        offerCount: number = -1,
        productCode: string = null,
        nftFurniType: number = 0
    ) {
        this._productCode = productCode;
        this._nftFurniType = nftFurniType;
        this._offerId = offerId;
        this._furniId = furniId;
        this._furniType = furniType;
        this._extraData = extraData;
        this._stuffData = stuffData;
        this._price = price;
        this._status = status;
        this._averagePrice = averagePrice;
        this._offerCount = offerCount;
    }

    public get offerId(): number {
        return this._offerId;
    }

    public set offerId(offerId: number) {
        this._offerId = offerId;
    }

    public get furniId(): number {
        return this._furniId;
    }

    public get furniType(): number {
        return this._furniType;
    }

    public get extraData(): string {
        return this._extraData;
    }

    public get stuffData(): IObjectData {
        return this._stuffData;
    }

    public get price(): number {
        return this._price;
    }

    public set price(price: number) {
        this._price = price;
    }

    public get averagePrice(): number {
        return this._averagePrice;
    }

    public get image(): string {
        return this._image;
    }

    public set image(image: string) {
        this._image = image;
    }

    public get imageCallback(): number {
        return this._imageCallback;
    }

    public set imageCallback(callback: number) {
        this._imageCallback = callback;
    }

    public get status(): number {
        return this._status;
    }

    public get timeLeftMinutes(): number {
        return this._timeLeftMinutes;
    }

    public set timeLeftMinutes(minutes: number) {
        this._timeLeftMinutes = minutes;
    }

    public get offerCount(): number {
        return this._offerCount;
    }

    public set offerCount(count: number) {
        this._offerCount = count;
    }

    /** A collectible (AIR's Collectibles marketplace): priced in emeralds, bought by its product code. */
    public get isNft(): boolean {
        return this._furniType === MarketplaceOfferData.TYPE_NFT;
    }

    /** The collectible's product code: its furni class name. */
    public get productCode(): string {
        return this._productCode;
    }

    /** The collectible's furni kind: 1 floor, 2 wall. */
    public get nftFurniType(): number {
        return this._nftFurniType;
    }

    /** A wall furni, whether a furni offer or a collectible. */
    public get isWallItem(): boolean {
        return isMarketplaceWallOffer(this);
    }

    public get isUniqueLimitedItem(): boolean {
        return this.stuffData && this.stuffData.uniqueSeries > 0;
    }
}

/** A wall furni: a furni offer of the wall type, or a collectible whose kind is wall. */
export const isMarketplaceWallOffer = (offer: { furniType: number; nftFurniType?: number }): boolean =>
    offer.furniType === MarketplaceOfferData.TYPE_NFT
        ? offer.nftFurniType === MarketplaceOfferData.TYPE_WALL
        : offer.furniType === MarketplaceOfferData.TYPE_WALL;
