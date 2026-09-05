import { CreateLinkEvent, GetSessionDataManager, StringDataType } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText } from '../../../../../api';
import { Button, Flex } from '../../../../../common';
import { useCatalogData, useCatalogUiState, useUserGroups } from '../../../../../hooks';

interface CatalogGuildSelectorWidgetViewProps {
    ownerOnly?: boolean;
}

export const CatalogGuildSelectorWidgetView: FC<CatalogGuildSelectorWidgetViewProps> = (props) => {
    const { ownerOnly = false } = props;
    const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
    const { currentOffer = null } = useCatalogData();
    const { setPurchaseOptions = null } = useCatalogUiState();
    const { data: allGroups = null } = useUserGroups();

    const groups = useMemo(() => {
        if (!allGroups || !ownerOnly) return allGroups;

        const ownerId = GetSessionDataManager().userId;
        const hasOwnerData = allGroups.some((group) => typeof (group as { ownerId?: number }).ownerId === 'number');

        if (!hasOwnerData) return allGroups;

        return allGroups.filter((group) => (group as { ownerId?: number }).ownerId === ownerId);
    }, [allGroups, ownerOnly]);

    useEffect(() => {
        if (groups && selectedGroupIndex >= groups.length) setSelectedGroupIndex(0);
    }, [groups, selectedGroupIndex]);

    const previewStuffData = useMemo(() => {
        if (!groups || !groups.length) return null;

        const group = groups[selectedGroupIndex];

        if (!group) return null;

        const stuffData = new StringDataType();

        stuffData.setValue(['0', group.groupId.toString(), group.badgeCode, group.colorA, group.colorB]);

        return stuffData;
    }, [selectedGroupIndex, groups]);

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

    if (!groups || !groups.length) {
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

    const selectedGroup = groups[selectedGroupIndex];

    return (
        <div className="flex gap-1">
            {!!selectedGroup && (
                <Flex className="rounded border" overflow="hidden">
                    <div className="h-full" style={{ width: '20px', backgroundColor: '#' + selectedGroup.colorA }} />
                    <div className="h-full" style={{ width: '20px', backgroundColor: '#' + selectedGroup.colorB }} />
                </Flex>
            )}
            <select className="form-select form-select-sm" value={selectedGroupIndex} onChange={(event) => setSelectedGroupIndex(parseInt(event.target.value))}>
                {groups.map((group, index) => (
                    <option key={index} value={index}>
                        {group.groupName}
                    </option>
                ))}
            </select>
        </div>
    );
};
