import { GroupInformationEvent, GroupSettingsEvent, HabboGroupDeactivatedMessageEvent } from '@octane/renderer';
import { FC, useState } from 'react';
import { GroupBadgePart, IGroupData, LocalizeText } from '../../../api';
import { useMessageEvent } from '../../../hooks';
import { GroupManagementWindow } from './GroupManagementWindow';
import { GroupText } from './GroupNativeLayout';
import { GroupTabBadgeView } from './tabs/GroupTabBadgeView';
import { GroupTabColorsView } from './tabs/GroupTabColorsView';
import { GroupTabIdentityView } from './tabs/GroupTabIdentityView';
import { GroupTabSettingsView } from './tabs/GroupTabSettingsView';
import { BaseButton } from '../../../common/BaseButton';

const TABS: number[] = [1, 2, 3, 5];

// edit_guild_tab_context sits at (-6, 89); its tab_buttons scale to their captions: [x, width, caption shift] as drawn by the v75 client.
const TAB_RECTS: [number, number, number][] = [
    [0, 78, 2],
    [77, 77, 1],
    [152, 77, 1],
    [227, 82, 2]
];

export const GroupManagerView: FC<{}> = (props) => {
    const [currentTab, setCurrentTab] = useState<number>(1);
    const [closeAction, setCloseAction] = useState<{ action: () => boolean }>(null);
    const [groupData, setGroupData] = useState<IGroupData>(null);

    const onClose = () => {
        if (closeAction?.action && !closeAction.action()) return;

        setCloseAction(null);
        setGroupData(null);
    };

    const changeTab = (tab: number) => {
        if (tab === currentTab) return;
        if (closeAction?.action && !closeAction.action()) return;

        setCurrentTab(tab);
    };

    useMessageEvent<GroupInformationEvent>(GroupInformationEvent, (event) => {
        const parser = event.getParser();

        if (!groupData || groupData.groupId !== parser.id) return;

        setGroupData((prevValue) => {
            const newValue = { ...prevValue };

            newValue.groupName = parser.title;
            newValue.groupDescription = parser.description;
            newValue.groupState = parser.type;
            newValue.groupCanMembersDecorate = parser.canMembersDecorate;
            newValue.groupHasForum = parser.hasForum;
            newValue.groupMembersCount = parser.membersCount;

            return newValue;
        });
    });

    useMessageEvent<GroupSettingsEvent>(GroupSettingsEvent, (event) => {
        const parser = event.getParser();

        const groupBadgeParts: GroupBadgePart[] = [];

        parser.badgeParts.forEach((part, id) => {
            groupBadgeParts.push(new GroupBadgePart(part.isBase ? GroupBadgePart.BASE : GroupBadgePart.SYMBOL, part.key, part.color, part.position));
        });

        setCurrentTab(1);
        setCloseAction(null);
        setGroupData({
            groupId: parser.id,
            groupName: parser.title,
            groupDescription: parser.description,
            groupHomeroomId: parser.roomId,
            groupState: parser.state,
            groupCanMembersDecorate: parser.canMembersDecorate,
            groupHasForum: parser.hasForum,
            groupMembersCount: parser.membersCount,
            groupColors: [parser.colorA, parser.colorB],
            groupBadgeParts
        });
    });

    useMessageEvent<HabboGroupDeactivatedMessageEvent>(HabboGroupDeactivatedMessageEvent, (event) =>
    {
        if (groupData?.groupId !== event.getParser().groupId) return;

        setCloseAction(null);
        setGroupData(null);
    });

    if (!groupData || groupData.groupId <= 0) return null;

    return (
        <GroupManagementWindow
            caption={LocalizeText(`group.edit.tabcaption.${currentTab}`)}
            description={LocalizeText(`group.edit.tabdesc.${currentTab}`)}
            headerImageStep={currentTab}
            tabs={
                <div className="octane-group-native__tabs">
                    {TABS.map((tab, index) => (
                        <BaseButton
                            key={tab}
                            className={`octane-group-native__tab${currentTab === tab ? ' is-selected' : ''}`}
                            style={{ left: TAB_RECTS[index][0], width: TAB_RECTS[index][1], paddingLeft: TAB_RECTS[index][2] * 2 }}
                            type="button"
                            onClick={() => changeTab(tab)}
                        >
                            <GroupText blend="multiply" className="is-static" text={LocalizeText(`group.edit.tab.${tab}`)} textStyle="button_tab" x={0} y={0} />
                        </BaseButton>
                    ))}
                </div>
            }
            uniqueKey="group-manager"
            onClose={onClose}
        >
            {currentTab === 1 && <GroupTabIdentityView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} />}
            {currentTab === 2 && <GroupTabBadgeView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} skipDefault={true} />}
            {currentTab === 3 && <GroupTabColorsView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} />}
            {currentTab === 5 && <GroupTabSettingsView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} />}
        </GroupManagementWindow>
    );
};
