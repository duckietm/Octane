import { CreateLinkEvent, GroupSaveInformationComposer } from '@octane/renderer';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react';
import { GetGroupMembers, IGroupData, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { LayoutBadgeImageView } from '../../../../common';
import { useGroupAlert } from '../GroupNativeAlertView';
import { flatText, GroupBox, GroupDropMenu, GroupInput, GroupText } from '../GroupNativeLayout';

interface GroupTabIdentityViewProps {
    groupData: IGroupData;
    setGroupData: Dispatch<SetStateAction<IGroupData>>;
    setCloseAction: Dispatch<SetStateAction<{ action: () => boolean }>>;
    isCreator?: boolean;
    availableRooms?: { id: number; name: string }[];
}

// step_cont_1 sits at client y=128; every rectangle below is the layout rectangle inside it.
const STEP_Y = 128;

export const GroupTabIdentityView: FC<GroupTabIdentityViewProps> = (props) => {
    const { groupData = null, setGroupData = null, setCloseAction = null, isCreator = false, availableRooms = [] } = props;
    const [groupName, setGroupName] = useState<string>('');
    const [groupDescription, setGroupDescription] = useState<string>('');
    const [groupHomeroomId, setGroupHomeroomId] = useState<number>(-1);
    const showAlert = useGroupAlert();

    const saveIdentity = useCallback(() => {
        if (!groupData) return false;
        if (isCreator && (!groupName.length || groupHomeroomId <= 0))
        {
            showAlert({ title: LocalizeText('group.edit.error.title'), message: LocalizeText('group.edit.error.no.name.or.room.selected') });
            return false;
        }
        if (groupName.length > 30 || groupDescription.length >= 255)
        {
            const message = groupName.length > 30
                ? localizeWithFallback('group.edit.error.name.length', 'Group names can contain up to 30 characters.')
                : localizeWithFallback('group.edit.error.desc.length', 'Group descriptions can contain up to 254 characters.');
            showAlert({ title: LocalizeText('group.edit.error.title'), message: message });
            return false;
        }

        // A new group also carries the chosen home room, so a room-only change still has to be stored.
        const isRoomChanged = groupData.groupId <= 0 && groupHomeroomId !== groupData.groupHomeroomId;

        if (!isRoomChanged && groupName === groupData.groupName && groupDescription === groupData.groupDescription) return true;

        if (groupData.groupId <= 0) {
            if (groupHomeroomId <= 0) return false;

            setGroupData((prevValue) => {
                const newValue = { ...prevValue };

                newValue.groupName = groupName;
                newValue.groupDescription = groupDescription;
                newValue.groupHomeroomId = groupHomeroomId;

                return newValue;
            });

            return true;
        }

        SendMessageComposer(new GroupSaveInformationComposer(groupData.groupId, groupName, groupDescription || ''));
        setGroupData(prevValue => ({ ...prevValue, groupName, groupDescription }));

        return true;
    }, [groupData, groupName, groupDescription, groupHomeroomId, setGroupData, showAlert, isCreator]);

    useEffect(() => {
        setGroupName(groupData.groupName || '');
        setGroupDescription(groupData.groupDescription || '');
        setGroupHomeroomId(groupData.groupHomeroomId);
    }, [groupData.groupId, groupData.groupName, groupData.groupDescription, groupData.groupHomeroomId]);

    useEffect(() => {
        setCloseAction({ action: saveIdentity });

        return () => setCloseAction(null);
    }, [setCloseAction, saveIdentity]);

    if (!groupData) return null;

    return (
        <div className="octane-group-native__step-body" style={{ top: STEP_Y }}>
            {!isCreator && (
                <>
                    <GroupBox height={94} kind="white" width={94} x={17} y={11}>
                        <GroupBox height={86} kind="tan" width={86} x={4} y={4} />
                        <div className="octane-group-native__badge" style={{ left: 27, top: 27 }}>
                            <LayoutBadgeImageView badgeCode={groupData.groupBadgeParts.map((part) => part.previewCode || '').join('')} isGroup={true} isPreview={true} />
                        </div>
                    </GroupBox>
                    <GroupText
                        align="center"
                        className="is-link"
                        overrides={{ underline: true }}
                        textStyle="u_bold"
                        text={LocalizeText('group.membercount', ['totalMembers'], [String(groupData.groupMembersCount ?? 0)])}
                        width={94}
                        x={17}
                        y={110}
                        onClick={() => {
                            if (saveIdentity()) GetGroupMembers(groupData.groupId);
                        }}
                    />
                </>
            )}
            <GroupText overrides={flatText(13, { bold: true })} text={LocalizeText('group.edit.name')} width={107} x={126} y={-8} />
            <GroupInput height={26} label={LocalizeText('group.edit.name')} maxLength={29} value={groupName} width={247} x={126} y={14} onChange={setGroupName} />
            <GroupText overrides={flatText(13, { bold: true })} text={LocalizeText('group.edit.desc')} width={100} x={126} y={52} />
            <GroupInput height={80} label={LocalizeText('group.edit.desc')} maxLength={254} multiline value={groupDescription} width={247} x={126} y={74} onChange={setGroupDescription} />
            {isCreator && (
                <>
                    <GroupText overrides={flatText(13, { bold: true })} text={LocalizeText('group.edit.base')} width={101} x={126} y={166} />
                    <GroupDropMenu
                        height={26}
                        label={LocalizeText('group.edit.base')}
                        options={[{ value: -1, label: LocalizeText('group.edit.base.select.room') }, ...(availableRooms ?? []).map((room) => ({ value: room.id, label: room.name }))]}
                        value={groupHomeroomId > 0 ? groupHomeroomId : -1}
                        width={247}
                        x={126}
                        y={188}
                        onSelect={(value) => setGroupHomeroomId(value)}
                    />
                    <GroupText height={38} overrides={{ size: 13, italic: true }} wrap text={LocalizeText('group.edit.base.warning')} width={247} x={126} y={214} />
                    <GroupText
                        className="is-link"
                        height={38}
                        wrap
                        overrides={{ size: 13, underline: true }}
                        text={LocalizeText('group.createroom')}
                        width={247}
                        x={126}
                        y={252}
                        onClick={() => CreateLinkEvent('navigator/create')}
                    />
                </>
            )}
        </div>
    );
};
