import { ICatalogNode } from './ICatalogNode';
import { IPurchasableOffer } from './IPurchasableOffer';

/** A navigator row while searching: the node and the item template depth it is drawn with. */
export interface SearchResultNode {
    node: ICatalogNode;
    depth: number;
}

export class SearchResult {
    constructor(
        public readonly searchValue: string,
        public readonly offers: IPurchasableOffer[],
        public readonly filteredNodes: SearchResultNode[]
    ) {}
}
