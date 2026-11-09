import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useUserGroups, useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const GROUP_CURRENT_ROOM = 0;
const GROUP_SELECTED = 1;

export const WiredConditionActorIsGroupMemberView: FC = () => {
    const { data: groups = [] } = useUserGroups();
    const [userSource, setUserSource] = useState(0);
    const [groupType, setGroupType] = useState(GROUP_CURRENT_ROOM);
    const [selectedGroupId, setSelectedGroupId] = useState(0);
    // Official layout: the group id in the string (empty: the room's group), no int params, the users in the
    // official source slot; the quantifier is the base view's.
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const groupId = parseInt((trigger.stringData ?? '').trim(), 10);

        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
        setGroupType(groupId > 0 ? GROUP_SELECTED : GROUP_CURRENT_ROOM);
        setSelectedGroupId(groupId > 0 ? groupId : 0);
    }, [trigger]);

    useEffect(() => {
        if (groupType !== GROUP_SELECTED || selectedGroupId || !groups.length) return;

        setSelectedGroupId(groups[0].groupId);
    }, [groupType, selectedGroupId, groups]);

    const selectedGroupOptions = useMemo(() => groups.map((group) => ({ value: group.groupId, label: group.groupName })), [groups]);

    const save = () => {
        setStringParam(groupType === GROUP_SELECTED && selectedGroupId > 0 ? String(selectedGroupId) : '');
        setIntParams([]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.groupselection')}</Text>
                        {[GROUP_CURRENT_ROOM, GROUP_SELECTED].map((value) => (
                            <label key={value} className="flex items-center gap-1">
                                <Radio checked={groupType === value} name="conditionGroupType" onCheckedChange={() => setGroupType(value)} />
                                <Text>{LocalizeText(`wiredfurni.params.grouptype.${value}`)}</Text>
                            </label>
                        ))}
                    </div>

                    {groupType === GROUP_SELECTED && (
                        <Select
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
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
