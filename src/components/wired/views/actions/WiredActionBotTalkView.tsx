import { FC, useEffect, useState } from 'react';
import { LocalizeText, WIRED_STRING_DELIMETER, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredTextCounter, WiredTextFormattingHelp } from '../common/WiredTextFormattingHelp';
import { BOT_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const normalizeBotSource = (value: number, hasBotName = false) => (BOT_SOURCES.some((option) => option.value === value) ? value : hasBotName ? 100 : 0);

export const WiredActionBotTalkView: FC<{}> = (props) => {
    const [botName, setBotName] = useState('');
    const [message, setMessage] = useState('');
    const [talkMode, setTalkMode] = useState(-1);
    const [botSource, setBotSource] = useState<number>(100);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    const maxMessageLength = 200;

    const save = () => {
        setStringParam((botSource === 100 ? botName : '') + WIRED_STRING_DELIMETER + message);
        setIntParams([talkMode, botSource]);
    };

    useEffect(() => {
        const data = trigger.stringData.split(WIRED_STRING_DELIMETER);
        const nextBotName = data.length > 0 ? data[0] : '';

        if (data.length > 0) setBotName(nextBotName);
        if (data.length > 1) setMessage(data[1].length > 0 ? data[1] : '');

        setTalkMode(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setBotSource(
            trigger.intData.length > 1 ? normalizeBotSource(trigger.intData[1], nextBotName.length > 0) : normalizeBotSource(-1, nextBotName.length > 0)
        );
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <WiredSourcesSelector
                    showUsers={true}
                    userSource={botSource}
                    userSources={BOT_SOURCES}
                    usersTitle="wiredfurni.params.sources.users.title.bots"
                    onChangeUsers={(value) => setBotSource(normalizeBotSource(value, botName.length > 0))}
                />
            }
        >
            {botSource === 100 && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                    <OctaneInput maxLength={32} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
                </div>
            )}
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.message')}</Text>
                <textarea
                    className="form-control form-control-sm octane-wired__resizable-textarea"
                    maxLength={maxMessageLength}
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                />
                <WiredTextCounter maxLength={maxMessageLength} value={message} />
                <WiredTextFormattingHelp />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <input
                        checked={talkMode === 0}
                        className="form-check-input"
                        id="talkMode1"
                        name="talkMode"
                        type="radio"
                        onChange={(event) => setTalkMode(0)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.talk')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <input
                        checked={talkMode === 1}
                        className="form-check-input"
                        id="talkMode2"
                        name="talkMode"
                        type="radio"
                        onChange={(event) => setTalkMode(1)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.shout')}</Text>
                </div>
            </div>
        </WiredActionBaseView>
    );
};
