import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { BOT_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCES.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

export const WiredActionBotFollowAvatarView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [followMode, setFollowMode] = useState(1);
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [botSource, setBotSource] = useState<number>(100);
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger, 1));

    // Official: the bot name (always), ints [start / stop]; the bots are user slot 0, the user to follow slot 1.
    const save = () => {
        setStringParam(botName);
        setIntParams([followMode]);
        setSourceTypes({ furni: [], users: [botSource, userSource] });
    };

    useEffect(() => {
        if (!trigger) return;

        const nextBotName = trigger.stringData || '';
        setBotName(nextBotName);
        setFollowMode(trigger.intData?.[0] ?? 1);
        setUserSource(slotUserSource(trigger, 1));
        setBotSource(normalizeBotSource(trigger.userSourceTypes?.[0] ?? -1, true));
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
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                <OctaneInput maxLength={32} title={LocalizeText('wiredfurni.tooltip.bot.name')} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                <div className="flex items-center gap-1">
                    <Radio checked={followMode === 1} id="followMode1" name="followMode" onCheckedChange={() => setFollowMode(1)} />
                    <Text>{LocalizeText('wiredfurni.params.start.following')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Radio checked={followMode === 0} id="followMode2" name="followMode" onCheckedChange={() => setFollowMode(0)} />
                    <Text>{LocalizeText('wiredfurni.params.stop.following')}</Text>
                </div>
            </div>
        </WiredActionBaseView>
    );
};
