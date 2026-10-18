import { GroupSaveBadgeComposer } from '@octane/renderer';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react';
import { GroupBadgePart, IGroupData, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useGroup } from '../../../../hooks';
import { GroupBadgeCreatorView } from '../GroupBadgeCreatorView';
import { useGroupAlert } from '../GroupNativeAlertView';
import { GroupBox, GroupButton, GroupText } from '../GroupNativeLayout';

interface GroupTabBadgeViewProps {
    skipDefault?: boolean;
    setCloseAction: Dispatch<SetStateAction<{ action: () => boolean }>>;
    groupData: IGroupData;
    setGroupData: Dispatch<SetStateAction<IGroupData>>;
}

// step_cont_2 sits at client y=110.
const STEP_Y = 110;

export const GroupTabBadgeView: FC<GroupTabBadgeViewProps> = (props) => {
    const { groupData = null, setGroupData = null, setCloseAction = null, skipDefault = null } = props;
    const [badgeParts, setBadgeParts] = useState<GroupBadgePart[]>(null);
    const { groupCustomize = null } = useGroup();
    const showAlert = useGroupAlert();

    const getModifiedBadgeCode = () => {
        if (!badgeParts || !badgeParts.length) return '';

        let badgeCode = '';

        badgeParts.forEach((part) => part.previewCode && (badgeCode += part.previewCode));

        return badgeCode;
    };

    const saveBadge = useCallback(() => {
        if (!groupData || !badgeParts || !badgeParts.length) return false;

        // A badge needs its base: without one the server would read the first symbol as the base.
        if (!GroupBadgePart.serialize(badgeParts)) {
            showAlert({ title: LocalizeText('group.edit.error.title'), message: localizeWithFallback('group.edit.error.no.badge.base', 'Choose a base for the badge.') });

            return false;
        }

        if (groupData.groupBadgeParts.length === badgeParts.length && badgeParts.every((part, index) =>
            part.key === groupData.groupBadgeParts[index].key && part.color === groupData.groupBadgeParts[index].color && part.position === groupData.groupBadgeParts[index].position)) return true;

        if (groupData.groupId <= 0) {
            setGroupData((prevValue) => {
                const newValue = { ...prevValue };

                newValue.groupBadgeParts = badgeParts;

                return newValue;
            });

            return true;
        }

        const badge = GroupBadgePart.serialize(badgeParts);

        SendMessageComposer(new GroupSaveBadgeComposer(groupData.groupId, badge));
        setGroupData(prevValue => ({ ...prevValue, groupBadgeParts: badgeParts }));

        return true;
    }, [groupData, badgeParts, setGroupData, showAlert]);

    useEffect(() => {
        if (groupData.groupBadgeParts && groupData.groupBadgeParts.length) return;

        if (!groupCustomize?.badgeBases?.length || !groupCustomize?.badgePartColors?.length) return;

        // The symbol layers open empty (the "+" buttons) with the first palette colour and position 0; the base starts on the first base so a badge is always valid.
        const color = groupCustomize.badgePartColors[0].id;
        const badgeParts = [
            new GroupBadgePart(GroupBadgePart.BASE, groupCustomize.badgeBases[0].id, color, 0),
            new GroupBadgePart(GroupBadgePart.SYMBOL, 0, color, 0),
            new GroupBadgePart(GroupBadgePart.SYMBOL, 0, color, 0),
            new GroupBadgePart(GroupBadgePart.SYMBOL, 0, color, 0),
            new GroupBadgePart(GroupBadgePart.SYMBOL, 0, color, 0)
        ];

        setGroupData((prevValue) => {
            const groupBadgeParts = badgeParts;

            return { ...prevValue, groupBadgeParts };
        });
    }, [groupData.groupBadgeParts, groupCustomize, setGroupData]);

    useEffect(() => {
        if (groupData.groupId <= 0) {
            const colorIds = groupCustomize?.badgePartColors?.map((color) => color.id) ?? [];

            setBadgeParts(groupData.groupBadgeParts ? GroupBadgePart.withPaletteColors([...groupData.groupBadgeParts], colorIds) : null);

            return;
        }

        setBadgeParts(groupData.groupBadgeParts);
    }, [groupData.groupId, groupData.groupBadgeParts, groupCustomize?.badgePartColors]);

    useEffect(() => {
        setCloseAction({ action: saveBadge });

        return () => setCloseAction(null);
    }, [setCloseAction, saveBadge]);

    return (
        <div className="octane-group-native__step-body" style={{ top: STEP_Y }}>
            <GroupText text={LocalizeText('group.edit.badge.badge')} textStyle="u_bold" x={25} y={8} />
            <GroupBox height={94} kind="white" width={94} x={17} y={29}>
                <GroupBox height={86} kind="tan" width={86} x={4} y={4} />
                <div className="octane-group-native__badge" style={{ left: 27, top: 27 }}>
                    <LayoutBadgeImageView badgeCode={getModifiedBadgeCode()} isGroup={true} />
                </div>
            </GroupBox>
            {groupData.groupId > 0 && (
                <GroupButton
                    height={29}
                    label={LocalizeText('group.edit.reset.badge')}
                    width={94}
                    x={17}
                    y={135}
                    onClick={() => setBadgeParts([...groupData.groupBadgeParts])}
                />
            )}
            <GroupBadgeCreatorView badgeParts={badgeParts} setBadgeParts={setBadgeParts} />
        </div>
    );
};
