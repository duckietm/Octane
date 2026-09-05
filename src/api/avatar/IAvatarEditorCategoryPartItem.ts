import { IFigurePartSet } from '@octane/renderer';

export interface IAvatarEditorCategoryPartItem {
    id?: number;
    partSet?: IFigurePartSet;
    usesColor?: boolean;
    maxPaletteCount?: number;
    isClear?: boolean;
    isSellableNotOwned?: boolean;
}
