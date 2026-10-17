import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';
import { BaseButton } from '../../../../common/BaseButton';

const ENTITY_HABBO = 1;
const ENTITY_PET = 2;
const ENTITY_BOT = 4;
const AVATAR_MODE_ANY = 0;
const AVATAR_MODE_CERTAIN = 1;
const SOURCE_SPECIFIED_USERNAME = 101;

const MATCH_USER_SOURCES: WiredSourceOption[] = [
    { value: 0, label: 'wiredfurni.params.sources.users.0' },
    { value: 200, label: 'wiredfurni.params.sources.users.200' },
    { value: 201, label: 'wiredfurni.params.sources.users.201' }
];

const COMPARE_USER_SOURCES: WiredSourceOption[] = [...MATCH_USER_SOURCES, { value: SOURCE_SPECIFIED_USERNAME, label: 'wiredfurni.params.sources.users.101' }];

interface WiredConditionTriggererMatchViewProps {
    negative?: boolean;
}

export const WiredConditionTriggererMatchView: FC<WiredConditionTriggererMatchViewProps> = ({ negative = false }) => {
    const [entityType, setEntityType] = useState(ENTITY_HABBO);
    const [avatarMode, setAvatarMode] = useState(AVATAR_MODE_ANY);
    const [username, setUsername] = useState('');
    const [matchUserSource, setMatchUserSource] = useState(0);
    const [compareUserSource, setCompareUserSource] = useState(0);
    const [quantifier, setQuantifier] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);
    // Official layout: [type mask (1 Habbo, 2 pet, 4 bot), our compare source, our quantifier], the name in
    // the string (empty: any), the users in the official source slot.
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();

    const needsUsername = avatarMode === AVATAR_MODE_CERTAIN || compareUserSource === SOURCE_SPECIFIED_USERNAME;
    const quantifierKeyPrefix = negative ? 'wiredfurni.params.quantifier.users.neg' : 'wiredfurni.params.quantifier.users';

    const save = () => {
        setIntParams([entityType || ENTITY_HABBO, compareUserSource, quantifier]);
        setStringParam(needsUsername ? username : '');
        setSourceTypes({ furni: [], users: [matchUserSource] });
    };

    useEffect(() => {
        if (!trigger) return;

        const compare = trigger.intData.length > 1 ? trigger.intData[1] : 0;
        const match = trigger.userSourceTypes?.[0] ?? 0;
        const nextQuantifier = trigger.intData.length > 2 ? trigger.intData[2] : 0;

        setEntityType(trigger.intData.length > 0 && trigger.intData[0] > 0 ? trigger.intData[0] : ENTITY_HABBO);
        setAvatarMode((trigger.stringData || '').length > 0 && compare !== SOURCE_SPECIFIED_USERNAME ? AVATAR_MODE_CERTAIN : AVATAR_MODE_ANY);
        setMatchUserSource(match);
        setCompareUserSource(compare);
        setQuantifier(nextQuantifier);
        setUsername(trigger.stringData || '');
        setShowAdvanced(match !== 0 || compare !== 0 || nextQuantifier !== 0);
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <BaseButton className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                        {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                    </BaseButton>
                    {showAdvanced && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                                {[0, 1].map((value) => {
                                    return (
                                        <div key={value} className="flex items-center gap-1">
                                            <Radio checked={quantifier === value} id={`triggererMatchQuantifier${value}`} name="triggererMatchQuantifier" onCheckedChange={() => setQuantifier(value)} />
                                            <Text>{LocalizeText(`${quantifierKeyPrefix}.${value}`)}</Text>
                                        </div>
                                    );
                                })}
                            </div>
                            <WiredSourcesSelector
                                showUsers={true}
                                userSource={matchUserSource}
                                userSources={MATCH_USER_SOURCES}
                                usersTitle="wiredfurni.params.sources.users.title.match.0"
                                onChangeUsers={setMatchUserSource}
                            />
                            <WiredSourcesSelector
                                showUsers={true}
                                userSlot={1}
                                userSource={compareUserSource}
                                userSources={COMPARE_USER_SOURCES}
                                usersTitle="wiredfurni.params.sources.users.title.match.1"
                                onChangeUsers={setCompareUserSource}
                            />
                        </>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-2">
                {[ENTITY_HABBO, ENTITY_PET, ENTITY_BOT].map((value) => {
                    return (
                        <div key={value} className="flex items-center gap-1">
                            <Checkbox checked={(entityType & value) !== 0} id={`triggererEntityType${value}`} name="triggererEntityType" onCheckedChange={() => setEntityType((current) => current ^ value)} />
                            <Text>{LocalizeText(`wiredfurni.params.usertype.${value}`)}</Text>
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.picktriggerer')}</Text>
                <div className="flex items-center gap-1">
                    <Radio checked={avatarMode === AVATAR_MODE_ANY} id="triggererAvatarMode0" name="triggererAvatarMode" onCheckedChange={() => setAvatarMode(AVATAR_MODE_ANY)} />
                    <Text>{LocalizeText('wiredfurni.params.anyavatar')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Radio checked={avatarMode === AVATAR_MODE_CERTAIN} id="triggererAvatarMode1" name="triggererAvatarMode" onCheckedChange={() => setAvatarMode(AVATAR_MODE_CERTAIN)} />
                    <Text>{LocalizeText('wiredfurni.params.certainavatar')}</Text>
                </div>
                {needsUsername && <OctaneInput type="text" value={username} onChange={(event) => setUsername(event.target.value)} />}
            </div>
        </WiredConditionBaseView>
    );
};
