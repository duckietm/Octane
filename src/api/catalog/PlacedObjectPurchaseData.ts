import { IFurnitureData, IProductData } from '@octane/renderer';
import { IPurchasableOffer } from './IPurchasableOffer';

export class PlacedObjectPurchaseData {
    constructor(
        public readonly roomId: number,
        public readonly objectId: number,
        public readonly category: number,
        public readonly wallLocation: string,
        public readonly x: number,
        public readonly y: number,
        public readonly direction: number,
        public readonly offer: IPurchasableOffer,
        /** What the buyer picked on the page (a group, a badge), when the offer asks for it. */
        public readonly pickedExtraParam: string | null = null
    ) {}

    public get offerId(): number {
        return this.offer.offerId;
    }

    public get productClassId(): number {
        return this.offer.product.productClassId;
    }

    public get productData(): IProductData {
        return this.offer.product.productData;
    }

    public get furniData(): IFurnitureData {
        return this.offer.product.furnitureData;
    }

    public get extraParam(): string {
        return this.pickedExtraParam ?? this.offer.product.extraParam;
    }
}
