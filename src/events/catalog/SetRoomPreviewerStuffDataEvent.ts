import { IObjectData, OctaneEvent } from '@octane/renderer';
import { IPurchasableOffer } from '../../api';

export class SetRoomPreviewerStuffDataEvent extends OctaneEvent {
    public static UPDATE_STUFF_DATA: string = 'SRPSA_UPDATE_STUFF_DATA';

    private _offer: IPurchasableOffer;
    private _stuffData: IObjectData;

    constructor(offer: IPurchasableOffer, stuffData: IObjectData) {
        super(SetRoomPreviewerStuffDataEvent.UPDATE_STUFF_DATA);

        this._offer = offer;
        this._stuffData = stuffData;
    }

    public get offer(): IPurchasableOffer {
        return this._offer;
    }

    public get stuffData(): IObjectData {
        return this._stuffData;
    }
}
