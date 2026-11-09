import { OctaneEvent } from '@octane/renderer';

export class CatalogPurchaseSoldOutEvent extends OctaneEvent {
    public static SOLD_OUT: string = 'CPSOE_SOLD_OUT';

    constructor() {
        super(CatalogPurchaseSoldOutEvent.SOLD_OUT);
    }
}
