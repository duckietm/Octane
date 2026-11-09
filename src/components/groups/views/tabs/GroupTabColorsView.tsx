import { GroupSaveColorsComposer } from '@octane/renderer';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react';
import { IGroupData, LocalizeText, SendMessageComposer } from '../../../../api';
import { useGroup } from '../../../../hooks';
import { GroupColorChip } from '../GroupBadgeCreatorView';
import { useGroupAlert } from '../GroupNativeAlertView';
import { GroupBox, GroupButton, GroupSwatch, GroupText } from '../GroupNativeLayout';

interface GroupTabColorsViewProps {
    groupData: IGroupData;
    setGroupData: Dispatch<SetStateAction<IGroupData>>;
    setCloseAction: Dispatch<SetStateAction<{ action: () => boolean }>>;
}

// step_cont_3 sits at client y=110.
const STEP_Y = 110;

export const GroupTabColorsView: FC<GroupTabColorsViewProps> = (props) => {
    const { groupData = null, setGroupData = null, setCloseAction = null } = props;
    const [colors, setColors] = useState<number[]>(null);
    const { groupCustomize = null } = useGroup();
    const showAlert = useGroupAlert();

    const getGroupColor = (colorIndex: number) => {
        if (!groupCustomize || !colors) return '000000';

        const list = colorIndex === 0 ? groupCustomize.groupColorsA : groupCustomize.groupColorsB;
        const found = list?.find((color) => color.id === colors[colorIndex]);

        return found ? found.color : '000000';
    };

    const selectColor = (colorIndex: number, colorId: number) => {
        setColors((prevValue) => {
            const newColors = [...prevValue];

            newColors[colorIndex] = colorId;

            return newColors;
        });
    };

    const saveColors = useCallback(() => {
        if (!groupData) return false;
        if (!colors || !groupCustomize?.groupColorsA?.some(color => color.id === colors[0]) || !groupCustomize?.groupColorsB?.some(color => color.id === colors[1]))
        {
            showAlert({ title: LocalizeText('group.edit.error.title'), message: LocalizeText('group.edit.error.no.color.selected') });
            return false;
        }

        if (groupData.groupColors[0] === colors[0] && groupData.groupColors[1] === colors[1]) return true;

        if (groupData.groupId <= 0) {
            setGroupData((prevValue) => {
                const newValue = { ...prevValue };

                newValue.groupColors = [...colors];

                return newValue;
            });

            return true;
        }

        SendMessageComposer(new GroupSaveColorsComposer(groupData.groupId, colors[0], colors[1]));
        setGroupData(prevValue => ({ ...prevValue, groupColors: [...colors] }));

        return true;
    }, [groupData, colors, setGroupData, groupCustomize, showAlert]);

    useEffect(() => {
        if (!groupCustomize?.groupColorsA?.length || !groupCustomize?.groupColorsB?.length || (groupData.groupColors && groupData.groupColors.length)) return;

        // The v75 layout opens with a different default each session (gold/gold, white/gold, white/white were all observed): first swatch of each list.
        const groupColors = [groupCustomize.groupColorsA[0].id, groupCustomize.groupColorsB[0].id];

        setGroupData((prevValue) => {
            return { ...prevValue, groupColors };
        });
    }, [groupCustomize, groupData.groupColors, setGroupData]);

    useEffect(() => {
        if (groupData.groupId <= 0) {
            setColors(groupData.groupColors ? [...groupData.groupColors] : null);

            return;
        }

        setColors(groupData.groupColors);
    }, [groupData.groupId, groupData.groupColors]);

    useEffect(() => {
        setCloseAction({ action: saveColors });

        return () => setCloseAction(null);
    }, [setCloseAction, saveColors]);

    if (!colors) return null;

    return (
        <div className="octane-group-native__step-body" style={{ top: STEP_Y }}>
            <GroupText align="center" text={LocalizeText('group.edit.color.guild.color')} textStyle="u_bold" width={92} x={13} y={8} />
            <GroupBox height={46} kind="outline" width={92} x={13} y={29}>
                <GroupBox height={38} kind="tan" width={84} x={4} y={4}>
                    <GroupSwatch color={getGroupColor(0)} x={4} y={4} />
                    <GroupSwatch color={getGroupColor(1)} x={44} y={4} />
                </GroupBox>
            </GroupBox>
            {groupData.groupId > 0 && <GroupButton height={29} label={LocalizeText('group.edit.reset.color')} width={90} x={15} y={85} onClick={() => setColors([...groupData.groupColors])} />}
            <GroupText align="center" text={LocalizeText('group.edit.color.primary.color')} textStyle="u_bold" width={142} x={128} y={8} />
            <GroupText align="center" text={LocalizeText('group.edit.color.secondary.color')} textStyle="u_bold" width={100} x={280} y={8} />
            <GroupBox height={277} kind="dark" width={142} x={128} y={29}>
                <div className="octane-group-native__color-grid" style={{ left: 3, top: 3, width: 138, gridTemplateColumns: 'repeat(9, 15px)' }}>
                    {groupCustomize?.groupColorsA.map((item) => (
                        <GroupColorChip key={item.id} color={item.color} selected={colors[0] === item.id} onSelect={() => selectColor(0, item.id)} />
                    ))}
                </div>
            </GroupBox>
            <GroupBox height={277} kind="dark" width={96} x={280} y={29}>
                <div className="octane-group-native__color-grid" style={{ left: 3, top: 3, width: 94, gridTemplateColumns: 'repeat(6, 15px)' }}>
                    {groupCustomize?.groupColorsB.map((item) => (
                        <GroupColorChip key={item.id} color={item.color} selected={colors[1] === item.id} onSelect={() => selectColor(1, item.id)} />
                    ))}
                </div>
            </GroupBox>
        </div>
    );
};
