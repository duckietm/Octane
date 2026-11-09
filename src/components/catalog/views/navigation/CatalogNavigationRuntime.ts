import { ICatalogNode } from '../../../../api';

export interface CatalogNavigationRuntime {
    activateNode: (node: ICatalogNode) => void;
    adminMode: boolean;
    createSubpage: (node: ICatalogNode) => void;
    deletePage: (node: ICatalogNode) => void;
    reorderPage: (pageId: number, parentId: number, index: number) => void;
}
