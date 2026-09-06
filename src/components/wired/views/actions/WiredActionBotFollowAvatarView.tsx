import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { BOT_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCES.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

export const WiredActionBotFollowAvatarView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [followMode, setFollowMode] = useState(-1);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    const [botSource, setBotSource] = useState<number>(100);
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });

    const save = () => {
        setStringParam(botSource === 100 ? botName : '');
        setIntParams([followMode, userSource, botSource]);
    };

    useEffect(() => {
        const nextBotName = trigger.stringData || '';
        setBotName(nextBotName);
        setFollowMode(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        setBotSource(
            trigger.intData.length > 2 ? normalizeBotSource(trigger.intData[2], nextBotName.length > 0) : normalizeBotSource(-1, nextBotName.length > 0)
        );
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />
                    <hr className="m-0 bg-dark" />
                    <WiredSourcesSelector
                        showUsers={true}
                        userSource={botSource}
                        userSources={BOT_SOURCES}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botName.length > 0))}
                    />
                </div>
            }
        >
            {botSource === 100 && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
            )}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <input
                        checked={followMode === 1}
                        className="form-check-input"
                        id="followMode1"
                        name="followMode"
                        type="radio"
                        onChange={(event) => setFollowMode(1)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.start.following')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        checked={followMode === 0}
                        className="form-check-input"
                        id="followMode2"
                        name="followMode"
                        type="radio"
                        onChange={(event) => setFollowMode(0)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.stop.following')}</Text>
                </div>
            </div>
        </WiredActionBaseView>
    );
};
