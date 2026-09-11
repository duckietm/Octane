import { FurnitureItem } from '../../api';
import { CatalogEvent } from '.';

export class CatalogPostMarketplaceOfferEvent extends CatalogEvent {
    public static readonly POST_MARKETPLACE = 'CE_POST_MARKETPLACE';

    private _item: FurnitureItem;
    private _sellableItems: FurnitureItem[];

    /**
     * @param sellableItems every copy of the same furni that could go into one offer. The
     *     official make-offer window sells the whole inventory selection at a single price
     *     (`MarketplaceModel.makeOffer`), so it needs the group and not only the copy that
     *     was clicked. Defaults to that single copy.
     */
    constructor(item: FurnitureItem, sellableItems: FurnitureItem[] = null) {
        super(CatalogPostMarketplaceOfferEvent.POST_MARKETPLACE);
        this._item = item;
        this._sellableItems = sellableItems && sellableItems.length ? sellableItems : item ? [item] : [];
    }

    public get item(): FurnitureItem {
        return this._item;
    }

    public get sellableItems(): FurnitureItem[] {
        return this._sellableItems;
    }
}
