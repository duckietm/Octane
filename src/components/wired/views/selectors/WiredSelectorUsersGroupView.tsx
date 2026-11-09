import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useUserGroups, useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const GROUP_CURRENT_ROOM = 0;
const GROUP_SELECTED = 1;

export const WiredSelectorUsersGroupView: FC<{}> = () => {
    const { data: groups = [], refresh = null } = useUserGroups();
    const [groupType, setGroupType] = useState(GROUP_CURRENT_ROOM);
    const [selectedGroupId, setSelectedGroupId] = useState(0);
    // Official layout: the group id in the string (empty: the room's group), no int params.
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        // AIR asks for the user's groups each time the editor opens (throttled in the hook).
        refresh?.();

        const groupId = parseInt((trigger.stringData ?? '').trim(), 10);

        setGroupType(groupId > 0 ? GROUP_SELECTED : GROUP_CURRENT_ROOM);
        setSelectedGroupId(groupId > 0 ? groupId : 0);
    }, [trigger, refresh]);

    useEffect(() => {
        if (groupType !== GROUP_SELECTED || selectedGroupId || !groups.length) return;

        setSelectedGroupId(groups[0].groupId);
    }, [groupType, selectedGroupId, groups]);

    const selectedGroupOptions = useMemo(() => groups.map((group) => ({ value: group.groupId, label: group.groupName })), [groups]);

    const save = () => {
        setIntParams([]);
        setStringParam(groupType === GROUP_SELECTED && selectedGroupId > 0 ? String(selectedGroupId) : '');
    };

    return (
        <NativeTextTree>
            <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.groupselection')}</Text>
                        {[GROUP_CURRENT_ROOM, GROUP_SELECTED].map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <Radio checked={groupType === value} name="usersGroupSelectorType" onCheckedChange={() => setGroupType(value)} />
                                <Text>{LocalizeText(`wiredfurni.params.grouptype.${value}`)}</Text>
                            </label>
                        ))}
                    </div>

                    {groupType === GROUP_SELECTED && (
                        <Select
                            aria-label={LocalizeText('wiredfurni.tooltip.group')}
                            className="form-select form-select-sm"
                            value={selectedGroupId}
                            onChange={(event) => setSelectedGroupId(parseInt(event.target.value))}
                        >
                            {!selectedGroupOptions.length && <option value={0}>-</option>}
                            {selectedGroupOptions.map((group) => (
                                <option key={group.value} value={group.value}>
                                    {group.label}
                                </option>
                            ))}
                        </Select>
                    )}

                </div>
            </WiredSelectorBaseView>
        </NativeTextTree>
    );
};
