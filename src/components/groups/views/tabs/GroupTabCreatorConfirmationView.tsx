import { Dispatch, FC, SetStateAction } from 'react';
import { IGroupData, LocalizeText } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useGroup } from '../../../../hooks';
import { flatText, GroupBox, GroupSwatch, GroupText } from '../GroupNativeLayout';

interface GroupTabCreatorConfirmationViewProps {
    groupData: IGroupData;
    setGroupData: Dispatch<SetStateAction<IGroupData>>;
    purchaseCost: number;
}

// step_cont_4 sits at client y=111.
const STEP_Y = 111;

export const GroupTabCreatorConfirmationView: FC<GroupTabCreatorConfirmationViewProps> = (props) => {
    const { groupData = null, purchaseCost = 0 } = props;
    const { groupCustomize = null } = useGroup();

    const getCompleteBadgeCode = () => {
        if (!groupData || !groupData.groupBadgeParts || !groupData.groupBadgeParts.length) return '';

        let badgeCode = '';

        groupData.groupBadgeParts.forEach((part) => part.previewCode && (badgeCode += part.previewCode));

        return badgeCode;
    };

    const getGroupColor = (colorIndex: number) => {
        const list = colorIndex === 0 ? groupCustomize?.groupColorsA : groupCustomize?.groupColorsB;

        return list?.find((color) => color.id === groupData.groupColors[colorIndex])?.color ?? '000000';
    };

    if (!groupData) return null;

    return (
        <div className="octane-group-native__step-body" style={{ top: STEP_Y }}>
            <GroupText height={45} overrides={flatText(18, { bold: true })} wrap text={groupData.groupName} width={256} x={126} y={8} />
            <GroupText height={215} overrides={flatText(13)} wrap text={LocalizeText('group.create.confirm.info')} width={260} x={126} y={46} />
            <GroupText align="center" text={LocalizeText('group.create.confirm.guildbadge')} textStyle="u_bold" width={92} x={15} y={33} />
            <GroupBox height={92} kind="white" width={92} x={15} y={50}>
                <GroupBox height={84} kind="tan" width={84} x={4} y={4} />
                <div className="octane-group-native__badge" style={{ left: 26, top: 26 }}>
                    <LayoutBadgeImageView badgeCode={getCompleteBadgeCode()} isGroup={true} isPreview={true} />
                </div>
            </GroupBox>
            <GroupText align="center" text={LocalizeText('group.create.confirm.guildcolors')} textStyle="u_bold" width={92} x={15} y={155} />
            <GroupBox height={46} kind="outline" width={92} x={15} y={172}>
                <GroupBox height={38} kind="tan" width={84} x={4} y={4}>
                    <GroupSwatch color={getGroupColor(0)} x={4} y={4} />
                    <GroupSwatch color={getGroupColor(1)} x={44} y={4} />
                </GroupBox>
            </GroupBox>
        </div>
    );
};
