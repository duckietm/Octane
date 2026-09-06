import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourceOption, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

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
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    const needsUsername = avatarMode === AVATAR_MODE_CERTAIN || compareUserSource === SOURCE_SPECIFIED_USERNAME;
    const quantifierKeyPrefix = negative ? 'wiredfurni.params.quantifier.users.neg' : 'wiredfurni.params.quantifier.users';

    const save = () => {
        setIntParams([entityType, avatarMode, matchUserSource, compareUserSource, quantifier]);
        setStringParam(username);
    };

    useEffect(() => {
        if (!trigger) return;

        setEntityType(trigger.intData.length > 0 ? trigger.intData[0] : ENTITY_HABBO);
        setAvatarMode(trigger.intData.length > 1 ? trigger.intData[1] : AVATAR_MODE_ANY);
        setMatchUserSource(trigger.intData.length > 2 ? trigger.intData[2] : 0);
        setCompareUserSource(trigger.intData.length > 3 ? trigger.intData[3] : 0);
        setQuantifier(trigger.intData.length > 4 ? trigger.intData[4] : 0);
        setUsername(trigger.stringData || '');
        setShowAdvanced(trigger.intData.length > 2 ? trigger.intData[2] !== 0 || trigger.intData[3] !== 0 || trigger.intData[4] !== 0 : false);
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <button className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                        {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                    </button>
                    {showAdvanced && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                                {[0, 1].map((value) => {
                                    return (
                                        <div key={value} className="flex items-center gap-1">
                                            <input
                                                checked={quantifier === value}
                                                className="form-check-input"
                                                id={`triggererMatchQuantifier${value}`}
                                                name="triggererMatchQuantifier"
                                                type="radio"
                                                onChange={() => setQuantifier(value)}
                                            />
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
                            <input
                                checked={entityType === value}
                                className="form-check-input"
                                id={`triggererEntityType${value}`}
                                name="triggererEntityType"
                                type="radio"
                                onChange={() => setEntityType(value)}
                            />
                            <Text>{LocalizeText(`wiredfurni.params.usertype.${value}`)}</Text>
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.picktriggerer')}</Text>
                <div className="flex items-center gap-1">
                    <input
                        checked={avatarMode === AVATAR_MODE_ANY}
                        className="form-check-input"
                        id="triggererAvatarMode0"
                        name="triggererAvatarMode"
                        type="radio"
                        onChange={() => setAvatarMode(AVATAR_MODE_ANY)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.anyavatar')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        checked={avatarMode === AVATAR_MODE_CERTAIN}
                        className="form-check-input"
                        id="triggererAvatarMode1"
                        name="triggererAvatarMode"
                        type="radio"
                        onChange={() => setAvatarMode(AVATAR_MODE_CERTAIN)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.certainavatar')}</Text>
                </div>
                {needsUsername && <OctaneInput type="text" value={username} onChange={(event) => setUsername(event.target.value)} />}
            </div>
        </WiredConditionBaseView>
    );
};
