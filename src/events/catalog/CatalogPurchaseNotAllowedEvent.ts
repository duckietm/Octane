import { OctaneEvent } from '@octane/renderer';

export class CatalogPurchaseNotAllowedEvent extends OctaneEvent {
    public static NOT_ALLOWED: string = 'CPNAE_NOT_ALLOWED';

    private _code: number;

    constructor(code: number) {
        super(CatalogPurchaseNotAllowedEvent.NOT_ALLOWED);

        this._code = code;
    }

    public get code(): number {
        return this._code;
    }
}
