import type { CatalogStudioPageSnapshot } from '../../admin/studio/CatalogStudioTypes';

export const createCatalogAdminPageDetailsFromSnapshot = (snapshot: CatalogStudioPageSnapshot) => ({
    pageId: snapshot.pageId,
    caption: snapshot.caption,
    captionSave: snapshot.captionSave,
    parentId: snapshot.parentId,
    catalogMode: snapshot.catalogMode,
    layout: snapshot.pageLayout,
    iconColor: snapshot.iconColor,
    iconImage: snapshot.iconImage,
    minRank: snapshot.minRank,
    orderNum: snapshot.orderNum,
    visible: snapshot.visible,
    enabled: snapshot.enabled,
    clubOnly: snapshot.clubOnly,
    vipOnly: snapshot.vipOnly,
    headline: snapshot.pageHeadline,
    teaser: snapshot.pageTeaser,
    special: snapshot.pageSpecial,
    textOne: snapshot.pageText1,
    textTwo: snapshot.pageText2,
    textDetails: snapshot.pageTextDetails,
    textTeaser: snapshot.pageTextTeaser,
    roomId: snapshot.roomId,
    includes: snapshot.includes
});
