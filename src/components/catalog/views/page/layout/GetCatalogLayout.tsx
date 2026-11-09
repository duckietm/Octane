import { FC } from 'react';
import { ICatalogPage } from '../../../../../api';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { CatalogLayoutBadgeDisplayView } from './CatalogLayoutBadgeDisplayView';
import { CatalogLayoutBuildersClubBuyView } from './CatalogLayoutBuildersClubBuyView';
import { CatalogLayoutCollectiblesView } from './CatalogLayoutCollectiblesView';
import { CatalogLayoutColorGroupingView } from './CatalogLayoutColorGroupingView';
import { CatalogLayoutDefaultView } from './CatalogLayoutDefaultView';
import { CatalogLayouGuildCustomFurniView } from './CatalogLayoutGuildCustomFurniView';
import { CatalogLayouGuildForumView } from './CatalogLayoutGuildForumView';
import { CatalogLayouGuildFrontpageView } from './CatalogLayoutGuildFrontpageView';
import { CatalogLayoutInfoRentablesView, CatalogLayoutMonkeyView, CatalogLayoutRecyclerInfoView } from './CatalogLayoutAirInfoPagesView';
import { CatalogLayoutInfoDucketsView, CatalogLayoutInfoLoyaltyView } from './CatalogLayoutInfoIllustrationView';
import { CatalogLayoutInformationView } from './CatalogLayoutInformationView';
import { CatalogLayoutPetCustomizationView } from './CatalogLayoutPetCustomizationView';
import { CatalogLayoutPets2View } from './CatalogLayoutPets2View';
import { CatalogLayoutPets3View } from './CatalogLayoutPets3View';
import { CatalogLayoutRecolorableFurnitureView } from './CatalogLayoutRecolorableFurnitureView';
import { CatalogLayoutRoomAdsView } from './CatalogLayoutRoomAdsView';
import { CatalogLayoutRoomBundleView } from './CatalogLayoutRoomBundleView';
import { CatalogLayoutSingleBundleView } from './CatalogLayoutSingleBundleView';
import { CatalogLayoutSoldLimitedView } from './CatalogLayoutSoldLimitedView';
import { CatalogLayoutSoundMachineView } from './CatalogLayoutSoundMachineView';
import { CatalogLayoutSpacesView } from './CatalogLayoutSpacesView';
import { CatalogLayoutTrophiesView } from './CatalogLayoutTrophiesView';
import { CatalogLayoutUnavailableView } from './CatalogLayoutUnavailableView';
import { CatalogLayoutVipBuyView } from './CatalogLayoutVipBuyView';
import { CatalogLayoutRenderer, getCatalogLayoutDefinition } from './catalogLayoutRegistry';
import { CatalogLayoutFrontpage4View } from './frontpage4/CatalogLayoutFrontpage4View';
import { CatalogLayoutMarketplaceOwnItemsView } from './marketplace/CatalogLayoutMarketplaceOwnItemsView';
import { CatalogLayoutMarketplacePublicItemsView } from './marketplace/CatalogLayoutMarketplacePublicItemsView';
import { CatalogLayoutPetView } from './pets/CatalogLayoutPetView';
import { CatalogLayoutRecyclerPrizesView } from './recycler/CatalogLayoutRecyclerPrizesView';
import { CatalogLayoutRecyclerView } from './recycler/CatalogLayoutRecyclerView';
import { CatalogLayoutVipGiftsView } from './vip-gifts/CatalogLayoutVipGiftsView';

const layoutRenderers: Record<CatalogLayoutRenderer, FC<CatalogLayoutProps>> = {
    badgeDisplay: CatalogLayoutBadgeDisplayView,
    buildersClubBuy: CatalogLayoutBuildersClubBuyView,
    clubGifts: CatalogLayoutVipGiftsView,
    collectibles: CatalogLayoutCollectiblesView,
    colorGrouping: CatalogLayoutColorGroupingView,
    default: CatalogLayoutDefaultView,
    frontpage: CatalogLayoutFrontpage4View,
    guildCustomFurni: CatalogLayouGuildCustomFurniView,
    guildForum: CatalogLayouGuildForumView,
    guildFrontpage: CatalogLayouGuildFrontpageView,
    info: CatalogLayoutInformationView,
    infoLoyalty: CatalogLayoutInfoLoyaltyView,
    infoDuckets: CatalogLayoutInfoDucketsView,
    infoRentables: CatalogLayoutInfoRentablesView,
    recyclerInfo: CatalogLayoutRecyclerInfoView,
    monkey: CatalogLayoutMonkeyView,
    marketplaceOwnItems: CatalogLayoutMarketplaceOwnItemsView,
    marketplacePublicItems: CatalogLayoutMarketplacePublicItemsView,
    petCustomization: CatalogLayoutPetCustomizationView,
    pets: CatalogLayoutPetView,
    pets2: CatalogLayoutPets2View,
    pets3: CatalogLayoutPets3View,
    recolorableFurniture: CatalogLayoutRecolorableFurnitureView,
    roomAds: CatalogLayoutRoomAdsView,
    roomBundle: CatalogLayoutRoomBundleView,
    recycler: CatalogLayoutRecyclerView,
    recyclerPrizes: CatalogLayoutRecyclerPrizesView,
    singleBundle: CatalogLayoutSingleBundleView,
    soundMachine: CatalogLayoutSoundMachineView,
    spaces: CatalogLayoutSpacesView,
    soldLimited: CatalogLayoutSoldLimitedView,
    trophies: CatalogLayoutTrophiesView,
    unavailable: CatalogLayoutUnavailableView,
    vipBuy: CatalogLayoutVipBuyView
};

export const GetCatalogLayout = (page: ICatalogPage, hideNavigation: () => void) => {
    if (!page) return null;

    const layoutProps: CatalogLayoutProps = { page, hideNavigation };
    const definition = getCatalogLayoutDefinition(page.layoutCode);
    const LayoutView = definition ? layoutRenderers[definition.renderer] : CatalogLayoutUnavailableView;

    return <LayoutView {...layoutProps} />;
};
