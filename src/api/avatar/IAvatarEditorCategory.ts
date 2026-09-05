import { IPartColor } from '@octane/renderer';
import { IAvatarEditorCategoryPartItem } from './IAvatarEditorCategoryPartItem';

export interface IAvatarEditorCategory {
    setType: string;
    partItems: IAvatarEditorCategoryPartItem[];
    colorItems: IPartColor[][];
}
