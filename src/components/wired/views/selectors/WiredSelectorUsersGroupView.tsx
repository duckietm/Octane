import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Text } from '../../../../common';
import { useUserGroups, useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';

const GROUP_CURRENT_ROOM = 0;
const GROUP_SELECTED = 1;

export const WiredSelectorUsersGroupView: FC<{}> = () => {
    const { data: groups = [] } = useUserGroups();
    const [groupType, setGroupType] = useState(GROUP_CURRENT_ROOM);
    const [selectedGroupId, setSelectedGroupId] = useState(0);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    // Official layout: the group id in the string (empty: the room's group), no int params.
    const { trigger = null, setIntParams = null, setStringParam = null, setSelectorOptions = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const groupId = parseInt((trigger.stringData ?? '').trim(), 10);

        setGroupType(groupId > 0 ? GROUP_SELECTED : GROUP_CURRENT_ROOM);
        setSelectedGroupId(groupId > 0 ? groupId : 0);
        setFilterExisting(trigger.isFilter ?? false);
        setInvert(trigger.isInvert ?? false);
    }, [trigger]);

    useEffect(() => {
        if (groupType !== GROUP_SELECTED || selectedGroupId || !groups.length) return;

        setSelectedGroupId(groups[0].groupId);
    }, [groupType, selectedGroupId, groups]);

    const selectedGroupOptions = useMemo(() => groups.map((group) => ({ value: group.groupId, label: group.groupName })), [groups]);

    const save = () => {
        setIntParams([]);
        setStringParam(groupType === GROUP_SELECTED && selectedGroupId > 0 ? String(selectedGroupId) : '');
        setSelectorOptions({ filter: filterExisting, invert });
    };

    return (
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

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <Checkbox checked={filterExisting} onCheckedChange={(nextChecked) => setFilterExisting(nextChecked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <Checkbox checked={invert} onCheckedChange={(nextChecked) => setInvert(nextChecked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
