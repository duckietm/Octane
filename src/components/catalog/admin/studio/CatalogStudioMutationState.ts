import { CatalogStudioMutationResult, CatalogStudioOfferSnapshot, CatalogStudioPageSnapshot, CatalogStudioSession } from './CatalogStudioTypes';

export const applyCatalogStudioMutation = (
    session: CatalogStudioSession,
    mutation: CatalogStudioMutationResult): CatalogStudioSession =>
{
    if(mutation.entityType === 'PAGE')
    {
        const entity = mutation.entity as CatalogStudioPageSnapshot;
        const index = session.pages.findIndex(page =>
            page.catalogType === mutation.catalogType && page.pageId === entity.pageId);
        const pages = session.pages.map(page => ({ ...page }));
        if(index >= 0) pages[index] = { ...entity };
        else pages.push({ ...entity });
        return {
            ...session,
            revision: mutation.revision,
            pendingCount: session.pendingCount + 1,
            validationCurrent: false,
            pages
        };
    }

    const entity = mutation.entity as CatalogStudioOfferSnapshot;
    const index = session.offers.findIndex(offer =>
        offer.catalogType === mutation.catalogType && offer.offerId === entity.offerId);
    const offers = session.offers.map(offer => ({ ...offer }));
    if(index >= 0) offers[index] = { ...entity };
    else offers.push({ ...entity });
    return {
        ...session,
        revision: mutation.revision,
        pendingCount: session.pendingCount + 1,
        validationCurrent: false,
        offers
    };
};
