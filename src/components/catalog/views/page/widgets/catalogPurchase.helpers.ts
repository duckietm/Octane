import { IPurchasableOffer } from '../../../../../api';

export const canPurchaseCatalogOffer = (offer: IPurchasableOffer | null | undefined): boolean => !!offer && !offer.isLazy && offer.haveOffer;
