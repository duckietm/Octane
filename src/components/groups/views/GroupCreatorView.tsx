import { GroupBadgePartsComposer, GroupBuyComposer, GroupBuyDataComposer, GroupBuyDataEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { CreateLinkEvent, GroupBadgePart, HasHabboClub, IGroupData, LocalizeText, SendMessageComposer } from '../../../api';
import creditIcon from '../../../assets/images/groups/native/gcreate_icon_credit.png';
import vipIcon from '../../../assets/images/groups/native/icon-vip-square.png';
import { useMessageEvent } from '../../../hooks';
import { flatText, GroupBox, GroupButton, GroupText } from './GroupNativeLayout';
import { GroupManagementWindow } from './GroupManagementWindow';
import { GroupTabBadgeView } from './tabs/GroupTabBadgeView';
import { GroupTabColorsView } from './tabs/GroupTabColorsView';
import { GroupTabCreatorConfirmationView } from './tabs/GroupTabCreatorConfirmationView';
import { GroupTabIdentityView } from './tabs/GroupTabIdentityView';

interface GroupCreatorViewProps {
    onClose: () => void;
}

let isBuyingGroup = false;

export const GroupCreatorView: FC<GroupCreatorViewProps> = (props) => {
    const { onClose = null } = props;
    const [currentTab, setCurrentTab] = useState<number>(1);
    const [closeAction, setCloseAction] = useState<{ action: () => boolean }>(null);
    const [groupData, setGroupData] = useState<IGroupData>(null);
    const [availableRooms, setAvailableRooms] = useState<{ id: number; name: string }[]>(null);
    const [purchaseCost, setPurchaseCost] = useState<number>(0);
    const hasClub = HasHabboClub();

    const onCloseClose = () => {
        setCloseAction(null);
        setGroupData(null);

        if (onClose) onClose();
    };

    const buyGroup = () => {
        if (!groupData || isBuyingGroup) return;

        // The badge step does not let a badge without a base through; a list that still lacks one is never sent.
        const badge = GroupBadgePart.serialize(groupData.groupBadgeParts);

        if (!badge) return;

        isBuyingGroup = true;
        setTimeout(() => (isBuyingGroup = false), 5000);

        SendMessageComposer(
            new GroupBuyComposer(
                groupData.groupName,
                groupData.groupDescription,
                groupData.groupHomeroomId,
                groupData.groupColors[0],
                groupData.groupColors[1],
                badge
            )
        );
    };

    const previousStep = () => {
        if (closeAction && closeAction.action) {
            if (!closeAction.action()) return;
        }

        if (currentTab === 1) {
            onCloseClose();

            return;
        }

        setCurrentTab((value) => value - 1);
    };

    const nextStep = () => {
        if (closeAction && closeAction.action) {
            if (!closeAction.action()) return;
        }

        setCurrentTab((value) => (value === 4 ? value : value + 1));
    };

    useMessageEvent<GroupBuyDataEvent>(GroupBuyDataEvent, (event) => {
        const parser = event.getParser();

        const rooms: { id: number; name: string }[] = [];

        parser.availableRooms.forEach((name, id) => rooms.push({ id, name }));

        setAvailableRooms(rooms);
        setPurchaseCost(parser.groupCost);

        // AIR opens the badge step on the server's default badge; a badge already being made is kept.
        const defaultBadgeParts = GroupBadgePart.fromBadgeSettings(parser.badgeParts ?? []);

        if (!defaultBadgeParts.length) return;

        setGroupData((prevValue) => {
            if (!prevValue || prevValue.groupBadgeParts?.length) return prevValue;

            return { ...prevValue, groupBadgeParts: defaultBadgeParts };
        });
    });

    useEffect(() => {
        setCurrentTab(1);

        setGroupData({
            groupId: -1,
            groupName: '',
            groupDescription: '',
            groupHomeroomId: -1,
            groupState: 1,
            groupCanMembersDecorate: true,
            groupHasForum: false,
            groupColors: [],
            groupBadgeParts: []
        });

        SendMessageComposer(new GroupBuyDataComposer());
        SendMessageComposer(new GroupBadgePartsComposer());
    }, [setGroupData]);

    if (!groupData) return null;

    return (
        <GroupManagementWindow
            caption={LocalizeText(`group.create.stepcaption.${currentTab}`)}
            description={LocalizeText(`group.create.stepdesc.${currentTab}`)}
            headerImageStep={currentTab}
            step={currentTab}
            uniqueKey="group-creator"
            onClose={onCloseClose}
        >
            {currentTab === 1 && (
                <GroupTabIdentityView availableRooms={availableRooms} groupData={groupData} isCreator={true} setCloseAction={setCloseAction} setGroupData={setGroupData} />
            )}
            {currentTab === 2 && <GroupTabBadgeView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} />}
            {currentTab === 3 && <GroupTabColorsView groupData={groupData} setCloseAction={setCloseAction} setGroupData={setGroupData} />}
            {currentTab === 4 && <GroupTabCreatorConfirmationView groupData={groupData} purchaseCost={purchaseCost} setGroupData={setGroupData} />}
            <div className="octane-group-native__footer">
                <GroupText
                    className="is-link"
                    overrides={flatText(12, { underline: true })}
                    text={LocalizeText(currentTab === 1 ? 'generic.cancel' : 'group.create.previousstep')}
                    x={11}
                    y={430}
                    onClick={previousStep}
                />
                {currentTab === 4 && !hasClub && (
                    <GroupBox height={39} kind="red" width={248} x={126} y={364} onClick={() => CreateLinkEvent('habboUI/open/hccenter')}>
                        <img alt="" className="octane-group-native__vip-icon" draggable={false} src={vipIcon} />
                        <GroupText background={0xcc0000} overrides={flatText(12, { bold: true, color: 0xffffff })} text={LocalizeText('group.create.confirm.viprequired')} x={38} y={4} />
                        <GroupText background={0xcc0000} overrides={flatText(12, { color: 0xffffff })} text={LocalizeText('group.create.confirm.getvip')} x={38} y={20} />
                    </GroupBox>
                )}
                {currentTab === 4 && (
                    <GroupBox height={39} kind={hasClub ? 'yellow' : 'gray'} width={248} x={126} y={410}>
                        <img alt="" className="octane-group-native__buy-icon" draggable={false} src={creditIcon} />
                        <GroupText
                            background={hasClub ? 0xffc300 : 0xaaaaaa}
                            height={34}
                            overrides={flatText(13)}
                            text={LocalizeText('group.create.confirm.buyinfo', ['amount'], [purchaseCost.toString()])}
                            width={131}
                            wrap
                            x={37}
                            y={3}
                        />
                        <GroupButton disabled={!hasClub} height={29} labelShift={2} label={LocalizeText('group.create.confirm.buy')} width={72} x={172} y={5} onClick={buyGroup} />
                    </GroupBox>
                )}
                {currentTab < 4 && <GroupButton height={29} label={LocalizeText('group.create.nextstep')} width={120} x={256} y={423} onClick={nextStep} />}
            </div>
        </GroupManagementWindow>
    );
};
