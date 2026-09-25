import { FC } from 'react';
import { LocalizeText, SanitizeHtml } from '../../../../../api';
import { Column, Flex, Grid } from '../../../../../common';
import { LayoutImage } from '../../../../../common/layout/LayoutImage';
import { useCatalogData, useCatalogUiState, useUserGroups } from '../../../../../hooks';
import { CatalogFirstProductSelectorWidgetView } from '../widgets/CatalogFirstProductSelectorWidgetView';
import { CatalogGuildBadgeWidgetView } from '../widgets/CatalogGuildBadgeWidgetView';
import { CatalogGuildSelectorWidgetView } from '../widgets/CatalogGuildSelectorWidgetView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogTotalPriceWidget } from '../widgets/CatalogTotalPriceWidget';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayouGuildForumView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const { currentOffer = null } = useCatalogData();
    const { purchaseOptions = null } = useCatalogUiState();
    const { data: groups = null } = useUserGroups();

    const teaserImage = page.localization.getImage(1);
    const hasGroups = !!(groups && groups.length);
    // The guild selector stores the chosen guild id as the purchase parameter.
    const selectedGroupId = purchaseOptions?.extraData ?? null;
    const selectedGroup = (selectedGroupId && groups?.find((group) => group.groupId.toString() === selectedGroupId)) || null;
    const selectedGroupHasForum = !!selectedGroup?.hasForum;

    return (
        <>
            <CatalogFirstProductSelectorWidgetView />
            <Grid overflow="hidden">
                <Column overflow="hidden" size={8}>
                    <div
                        className="octane-catalog-forum-text grow! min-h-0 overflow-auto text-black"
                        dangerouslySetInnerHTML={{ __html: SanitizeHtml(page.localization.getText(1)) }}
                    />
                    {!!currentOffer && (
                        <div className="flex shrink-0 flex-col gap-1">
                            <Flex alignItems="center" gap={2}>
                                <CatalogGuildBadgeWidgetView className="shrink-0" />
                                <CatalogTotalPriceWidget />
                                <div className="grow! min-w-0">
                                    <CatalogGuildSelectorWidgetView ownerOnly />
                                </div>
                            </Flex>
                            {selectedGroupHasForum && (
                                <div className="octane-catalog-forum-warning text-center text-[11px] text-[#a81a12]" role="alert">
                                    {LocalizeText('catalog.alert.group_has_forum')}
                                </div>
                            )}
                            {hasGroups && (
                                <div className="flex justify-center">
                                    <CatalogPurchaseWidgetView disabled={selectedGroupHasForum} noGiftOption={true} />
                                </div>
                            )}
                        </div>
                    )}
                </Column>
                <Column alignItems="center" overflow="hidden" size={4}>
                    {!!teaserImage && <LayoutImage className="max-w-full" imageUrl={teaserImage} />}
                </Column>
            </Grid>
        </>
    );
};
