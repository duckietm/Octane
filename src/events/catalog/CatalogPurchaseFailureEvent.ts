import { OctaneEvent } from '@octane/renderer';

export class CatalogPurchaseFailureEvent extends OctaneEvent {
    public static PURCHASE_FAILED: string = 'CPFE_PURCHASE_FAILED';

    private _code: number;

    constructor(code: number) {
        super(CatalogPurchaseFailureEvent.PURCHASE_FAILED);

        this._code = code;
    }

    public get code(): number {
        return this._code;
    }
}
