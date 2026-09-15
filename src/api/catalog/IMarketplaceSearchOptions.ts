export interface IMarketplaceSearchOptions {
    query: string;
    type: number;
    minPrice: number;
    maxPrice: number;
    /**
     * marketplace_search_simple.xml `combine_uniques_checkbox` (MarketPlaceCatalogWidget._combineUniques,
     * default true): fifth field of the official GetMarketplaceOffers composer (header 2407).
     */
    combineUniques?: boolean;
}
