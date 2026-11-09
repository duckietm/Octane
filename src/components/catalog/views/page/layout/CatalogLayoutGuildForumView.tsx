import { FC } from 'react';
import { GetConfigurationValue, LocalizeText, SanitizeHtml } from '../../../../../api';
import { Column, Flex, Grid } from '../../../../../common';
import { LayoutImage } from '../../../../../common/layout/LayoutImage';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
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

    // AIR layout_guild_forum_xml: the page's teaser, else the library's guild_forums_teaser.gif.
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const teaserImage = page.localization.getImage(1) || (imageLibraryUrl ? `${imageLibraryUrl}catalogue/guild_forums_teaser.gif` : '');
    const hasGroups = !!(groups && groups.length);
    // The guild selector stores the chosen guild id as the purchase parameter.
    const selectedGroupId = purchaseOptions?.extraData ?? null;
    const selectedGroup = (selectedGroupId && groups?.find((group) => group.groupId.toString() === selectedGroupId)) || null;
    // GuildForumSelectorCatalogWidget.selectGroup: a group that already has a forum only gets the warning that this buys another terminal
    // for it (catalog.alert.group_has_forum); the purchase stays open.
    const selectedGroupHasForum = !!selectedGroup?.hasForum;

    return (
        <NativeTextTree>
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
                                        <CatalogGuildSelectorWidgetView forumSelector />
                                    </div>
                                </Flex>
                                {selectedGroupHasForum && (
                                    <div className="octane-catalog-forum-warning text-center text-[11px] text-[#a81a12]" role="alert">
                                        {LocalizeText('catalog.alert.group_has_forum')}
                                    </div>
                                )}
                                {hasGroups && (
                                    <div className="flex justify-center">
                                        <CatalogPurchaseWidgetView noGiftOption={true} />
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
        </NativeTextTree>
    );
};
