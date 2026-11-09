import { GroupSavePreferencesComposer } from '@octane/renderer';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react';
import { IGroupData, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import groupTypeIcon0 from '../../../../assets/images/groups/native/grouptype_icon_0.png';
import groupTypeIcon1 from '../../../../assets/images/groups/native/grouptype_icon_1.png';
import groupTypeIcon2 from '../../../../assets/images/groups/native/grouptype_icon_2.png';
import { useNotification } from '../../../../hooks';
import { GroupBox, GroupText } from '../GroupNativeLayout';
import { GroupRichText } from '../GroupRichText';
import { BaseButton } from '../../../../common/BaseButton';

const STATES: string[] = ['regular', 'exclusive', 'private'];
const TYPE_ICONS: string[] = [groupTypeIcon0, groupTypeIcon1, groupTypeIcon2];

interface GroupTabSettingsViewProps {
    groupData: IGroupData;
    setGroupData: Dispatch<SetStateAction<IGroupData>>;
    setCloseAction: Dispatch<SetStateAction<{ action: () => boolean }>>;
}

// step_cont_5 sits at client y=111.
const STEP_Y = 111;

const Check: FC<{ checked: boolean; kind: 'radio' | 'checkbox'; x: number; y: number; onSelect: () => void }> = ({ checked, kind, x, y, onSelect }) => (
    <BaseButton aria-checked={checked} className={`octane-group-native__check is-${kind}${checked ? ' is-checked' : ''}`} role={kind} style={{ left: x, top: y }} type="button" onClick={onSelect} />
);

export const GroupTabSettingsView: FC<GroupTabSettingsViewProps> = (props) => {
    const { groupData = null, setGroupData = null, setCloseAction = null } = props;
    const [groupState, setGroupState] = useState<number>(groupData.groupState);
    const [groupDecorate, setGroupDecorate] = useState<boolean>(groupData.groupCanMembersDecorate);
    const [groupForum, setGroupForum] = useState<boolean>(groupData.groupHasForum ?? false);
    const { showConfirm = null } = useNotification();

    const handleForumToggle = useCallback(() => {
        if (groupForum) {
            // Disabling forum - show confirmation
            showConfirm(
                localizeWithFallback('group.forum.disable.confirm', 'Disable this group\'s forum?'),
                () => {
                    setGroupForum(false);
                },
                null
            );
        } else {
            setGroupForum(true);
        }
    }, [groupForum, showConfirm]);

    const saveSettings = useCallback(() => {
        if (!groupData) return false;

        if (groupState === groupData.groupState && groupDecorate === groupData.groupCanMembersDecorate && groupForum === (groupData.groupHasForum ?? false))
            return true;

        if (groupData.groupId <= 0) {
            setGroupData((prevValue) => {
                const newValue = { ...prevValue };

                newValue.groupState = groupState;
                newValue.groupCanMembersDecorate = groupDecorate;
                newValue.groupHasForum = groupForum;

                return newValue;
            });

            return true;
        }

        SendMessageComposer(new GroupSavePreferencesComposer(groupData.groupId, groupState, groupDecorate ? 0 : 1, groupForum));
        setGroupData(prevValue => ({ ...prevValue, groupState, groupCanMembersDecorate: groupDecorate, groupHasForum: groupForum }));

        return true;
    }, [groupData, groupState, groupDecorate, groupForum, setGroupData]);

    useEffect(() => {
        setGroupState(groupData.groupState);
        setGroupDecorate(groupData.groupCanMembersDecorate);
        setGroupForum(groupData.groupHasForum ?? false);
    }, [groupData.groupId, groupData.groupState, groupData.groupCanMembersDecorate, groupData.groupHasForum]);

    useEffect(() => {
        setCloseAction({ action: saveSettings });

        return () => setCloseAction(null);
    }, [setCloseAction, saveSettings]);

    return (
        <div className="octane-group-native__step-body" style={{ top: STEP_Y }}>
            <GroupText align="center" text={LocalizeText('group.edit.settings.type.caption')} textStyle="u_headline_small" width={170} x={16} y={6} />
            <GroupBox height={199} kind="white" width={170} x={16} y={29}>
                <GroupBox height={191} kind="tan" width={162} x={4} y={4}>
                    {STATES.map((state, index) => (
                        <div key={state}>
                            <Check checked={groupState === index} kind="radio" x={5} y={7 + index * 60} onSelect={() => setGroupState(index)} />
                            <GroupText text={LocalizeText(`group.edit.settings.type.${state}.label`)} textStyle="u_bold" x={25} y={5 + index * 60} />
                            <img alt="" className="octane-group-native__type-icon" draggable={false} src={TYPE_ICONS[index]} style={{ left: 5, top: 27 + index * 60 }} />
                            <GroupRichText html={LocalizeText(`group.edit.settings.type.${state}.help`)} width={132} x={25} y={20 + index * 60} />
                        </div>
                    ))}
                </GroupBox>
            </GroupBox>
            <GroupText align="center" text={LocalizeText('group.edit.settings.rights.caption')} textStyle="u_headline_small" width={170} x={207} y={6} />
            <GroupBox height={144} kind="white" width={170} x={207} y={29}>
                <GroupBox height={135} kind="tan" width={162} x={4} y={4}>
                    <Check checked={groupDecorate} kind="checkbox" x={5} y={5} onSelect={() => setGroupDecorate((value) => !value)} />
                    <GroupText text={LocalizeText('group.edit.settings.rights.members.label')} textStyle="u_bold" x={25} y={5} />
                    <GroupRichText html={LocalizeText('group.edit.settings.rights.members.help')} width={152} x={5} y={25} />
                </GroupBox>
            </GroupBox>
            <GroupBox height={86} kind="white" width={170} x={207} y={179}>
                <GroupBox height={78} kind="tan" width={162} x={4} y={4}>
                    <Check checked={groupForum} kind="checkbox" x={5} y={5} onSelect={handleForumToggle} />
                    <GroupText text={localizeWithFallback('group.forum.enable.caption', 'Enable / Disable group forum')} textStyle="u_bold" x={25} y={5} />
                    <GroupRichText html={localizeWithFallback('group.forum.enable.help', 'Members can open the group forum while this option is enabled.')} width={152} x={5} y={25} />
                </GroupBox>
            </GroupBox>
        </div>
    );
};
