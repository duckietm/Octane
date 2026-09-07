import { IObjectData } from '@octane/renderer';

export interface IPurchaseOptions {
    quantity?: number;
    extraData?: string;
    extraParamRequired?: boolean;
    previewStuffData?: IObjectData;
}
