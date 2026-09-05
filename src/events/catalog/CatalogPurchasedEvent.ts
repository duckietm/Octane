import { OctaneEvent, PurchaseOKMessageOfferData } from '@octane/renderer';

export class CatalogPurchasedEvent extends OctaneEvent {
    public static PURCHASE_SUCCESS: string = 'CPE_PURCHASE_SUCCESS';

    private _purchase: PurchaseOKMessageOfferData;

    constructor(purchase: PurchaseOKMessageOfferData) {
        super(CatalogPurchasedEvent.PURCHASE_SUCCESS);

        this._purchase = purchase;
    }

    public get purchase(): PurchaseOKMessageOfferData {
        return this._purchase;
    }
}
