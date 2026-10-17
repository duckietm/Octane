import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Radio } from '../../../../common/Radio';

const CARRY_MODE_DIRECT = 0;
const CARRY_MODE_SAME_TILE = 1;
const SOURCE_ALL_ROOM_USERS = 900;

const USER_SOURCES: WiredSourceOption[] = [
    { value: SOURCE_ALL_ROOM_USERS, label: 'wiredfurni.params.sources.users.900' },
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

const normalizeCarryMode = (value: number) => (value === CARRY_MODE_SAME_TILE ? CARRY_MODE_SAME_TILE : CARRY_MODE_DIRECT);
const normalizeUserSource = (value: number) => (USER_SOURCES.some((option) => option.value === value) ? value : SOURCE_ALL_ROOM_USERS);

export const WiredExtraMoveCarryUsersView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [carryMode, setCarryMode] = useState(CARRY_MODE_DIRECT);
    const [userSource, setUserSource] = useState(SOURCE_ALL_ROOM_USERS);

    useEffect(() => {
        if (!trigger) return;

        setCarryMode(normalizeCarryMode(trigger.intData.length > 0 ? trigger.intData[0] : CARRY_MODE_DIRECT));
        setUserSource(normalizeUserSource(trigger.intData.length > 1 ? trigger.intData[1] : SOURCE_ALL_ROOM_USERS));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeCarryMode(carryMode), normalizeUserSource(userSource)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            cardStyle={{ width: 420 }}
            footerCollapsible={false}
            footer={
                <WiredSourcesSelector
                    showUsers={true}
                    userSource={userSource}
                    userSources={USER_SOURCES}
                    usersTitle="wiredfurni.params.sources.users.title.carry"
                    allowClickedUserSource={false}
                    onChangeUsers={(value) => setUserSource(normalizeUserSource(value))}
                />
            }
        >
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.carry_mode')}</Text>
                <label className="flex items-center gap-1 cursor-pointer">
                    <Radio checked={carryMode === CARRY_MODE_DIRECT} name="wiredCarryMode" onCheckedChange={() => setCarryMode(CARRY_MODE_DIRECT)} />
                    <Text>{LocalizeText('wiredfurni.params.carry_mode.0')}</Text>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                    <Radio checked={carryMode === CARRY_MODE_SAME_TILE} name="wiredCarryMode" onCheckedChange={() => setCarryMode(CARRY_MODE_SAME_TILE)} />
                    <Text>{LocalizeText('wiredfurni.params.carry_mode.1')}</Text>
                </label>
            </div>
        </WiredExtraBaseView>
    );
};
