import { OctaneEvent } from '@octane/renderer';
import { CatalogWidgetEvent } from './CatalogWidgetEvent';

export class CatalogPurchaseOverrideEvent extends OctaneEvent {
    private _callback: Function;

    constructor(callback: Function) {
        super(CatalogWidgetEvent.PURCHASE_OVERRIDE);

        this._callback = callback;
    }

    public get callback(): Function {
        return this._callback;
    }
}
