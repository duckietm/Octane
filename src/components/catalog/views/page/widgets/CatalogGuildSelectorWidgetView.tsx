import { CatalogGroupsComposer, CreateLinkEvent, GetSessionDataManager, HabboGroupEntryData, StringDataType } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../api';
import { Button, Flex } from '../../../../../common';
import { useCatalogData, useCatalogUiState, useUserGroups } from '../../../../../hooks';
import { Select } from '../../../../../common/Select';

interface CatalogGuildSelectorWidgetViewProps {
    /** GuildForumSelectorCatalogWidget: the selector of the group forum page (layout guild_forum). */
    forumSelector?: boolean;
}

/**
 * GuildForumSelectorCatalogWidget.filterGroupMemberships: a forum terminal can be bought for a group that already has a
 * forum, for a group the user owns, or for any group by staff (security level 4).
 */
export const filterGuildForumGroups = (groups: HabboGroupEntryData[], userId: number, isStaff: boolean): HabboGroupEntryData[] =>
    groups.filter((group) => group.hasForum || group.ownerId === userId || isStaff);

/** GuildSelectorCatalogWidget.populateAndSelectFavorite: the user's own pick, else the favourite group, else the first one. */
export const getInitialGuildIndex = (groups: HabboGroupEntryData[], pickedIndex: number): number => {
    if (pickedIndex >= 0 && pickedIndex < groups.length) return pickedIndex;

    let favouriteIndex = -1;

    groups.forEach((group, index) => {
        if (group.favourite) favouriteIndex = index;
    });

    if (favouriteIndex >= 0) return favouriteIndex;

    return groups.length ? 0 : -1;
};

export const CatalogGuildSelectorWidgetView: FC<CatalogGuildSelectorWidgetViewProps> = (props) => {
    const { forumSelector = false } = props;
    // The entry the user picked from the drop menu; -1 until they pick one.
    const [pickedIndex, setPickedIndex] = useState<number>(-1);
    const { currentOffer = null } = useCatalogData();
    const { setPurchaseOptions = null } = useCatalogUiState();
    const { data: allGroups = null } = useUserGroups();

    // GuildMembershipsController.registerGuildSelectorWidget: every selector asks for the user's groups again.
    useEffect(() => {
        SendMessageComposer(new CatalogGroupsComposer());
    }, []);

    const groups = useMemo(() => {
        if (!allGroups || !forumSelector) return allGroups;

        const sessionData = GetSessionDataManager();

        return filterGuildForumGroups(allGroups, sessionData.userId, sessionData.hasSecurity(4));
    }, [allGroups, forumSelector]);

    const selectedIndex = groups ? getInitialGuildIndex(groups, pickedIndex) : -1;
    const selectedGroup = selectedIndex >= 0 ? groups[selectedIndex] : null;

    // selectGroup: the previewer gets ["0", group id, badge, colour 1, colour 2] and the purchase the group id as its extra parameter.
    const previewStuffData = useMemo(() => {
        if (!selectedGroup) return null;

        const stuffData = new StringDataType();

        stuffData.setValue(['0', selectedGroup.groupId.toString(), selectedGroup.badgeCode, selectedGroup.colorA, selectedGroup.colorB]);

        return stuffData;
    }, [selectedGroup]);

    useEffect(() => {
        if (!currentOffer) return;

        setPurchaseOptions((prevValue) => {
            const newValue = { ...prevValue };

            newValue.extraParamRequired = true;
            newValue.extraData = (previewStuffData && previewStuffData.getValue(1)) || null;
            newValue.previewStuffData = previewStuffData;

            return newValue;
        });
    }, [currentOffer, previewStuffData, setPurchaseOptions]);

    // The members-only note only replaces the selector when the user is in no group at all; a forum selector whose filter
    // leaves nothing shows an empty drop menu, and the purchase waits for a group.
    if (!allGroups || !allGroups.length) {
        return (
            <div className="bg-[#5da0aa] rounded-lg p-2 text-black text-center">
                {LocalizeText('catalog.guild_selector.members_only')}
                <div className="mt-1">
                    <Button classNames={['octane-catalog-guild-join-btn']} onClick={() => CreateLinkEvent('navigator/search/hotel_view/group:')}>
                        {LocalizeText('catalog.guild_selector.find_groups')}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-1">
            {!!selectedGroup && (
                <Flex className="rounded border" overflow="hidden">
                    <div className="h-full" style={{ width: '20px', backgroundColor: '#' + selectedGroup.colorA }} />
                    <div className="h-full" style={{ width: '20px', backgroundColor: '#' + selectedGroup.colorB }} />
                </Flex>
            )}
            <Select className="form-select form-select-sm" value={selectedIndex} onChange={(event) => setPickedIndex(parseInt(event.target.value))}>
                {groups.map((group, index) => (
                    <option key={group.groupId} value={index}>
                        {group.groupName}
                    </option>
                ))}
            </Select>
        </div>
    );
};
