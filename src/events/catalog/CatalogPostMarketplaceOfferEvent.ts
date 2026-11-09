import { FurnitureItem } from '../../api';
import { CatalogEvent } from '.';

export class CatalogPostMarketplaceOfferEvent extends CatalogEvent {
    public static readonly POST_MARKETPLACE = 'CE_POST_MARKETPLACE';

    private _item: FurnitureItem;
    private _items: FurnitureItem[];

    /** `items` are all copies that may be listed together; `item` is the one shown. */
    constructor(item: FurnitureItem, items: FurnitureItem[] = null) {
        super(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE);
        this._item = item;
        this._items = (items && items.length) ? items : [item];
    }

    public get item(): FurnitureItem {
        return this._item;
    }

    public get items(): FurnitureItem[] {
        return this._items;
    }
}
