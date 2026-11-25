import { IPurchasableOffer } from '../../../../../api';

/**
 * Whether the offer can be bought: any offer the server has resolved. A search result that is still being looked
 * up (lazy) cannot. The catalogue's `have_offer` flag does not decide this: as on the server, it only says whether
 * the offer may be bought several at a time with the bulk discount (the amount selector reads
 * `bundlePurchaseAllowed` for that), so an offer without it is still bought one at a time.
 */
export const canPurchaseCatalogOffer = (offer: IPurchasableOffer | null | undefined): boolean => !!offer && !offer.isLazy;
