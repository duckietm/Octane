import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WIRED_STRING_DELIMETER, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredTextCounter, WiredTextFormattingHelp } from '../common/WiredTextFormattingHelp';
import { WiredBubbleWidthSelect } from '../WiredBubbleWidthSelect';
import { BOT_SOURCES, WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { WiredPlaceholderInsert } from '../WiredPlaceholderInsert';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';
import { CollapsibleSection } from '../../../../common/CollapsibleSection';

const MESSAGE_MAX_LENGTH = 400;

const normalizeBotSource = (value: number) => (BOT_SOURCES.some((option) => option.value === value) ? value : 100);

interface WiredActionBotTalkBaseViewProps {
    /** Talk to an avatar: whisper first, and the users talked to in user slot 1. */
    toAvatar: boolean;
}

/**
 * Bot talk / bot talk to avatar. Official: "name\tmessage" (the name always shown and sent, the message
 * up to 400), ints [mode, bubble width, hide the bot name]; the bots are user slot 0 (and the users
 * talked to slot 1).
 */
export const WiredActionBotTalkBaseView: FC<WiredActionBotTalkBaseViewProps> = ({ toAvatar }) => {
    const [botName, setBotName] = useState('');
    const [message, setMessage] = useState('');
    const [talkMode, setTalkMode] = useState(toAvatar ? 1 : 0);
    const [botSource, setBotSource] = useState<number>(100);
    const [userSource, setUserSource] = useState<number>(0);
    const [bubbleWidth, setBubbleWidth] = useState<number>(-1);
    const [hideBotName, setHideBotName] = useState(false);
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();

    const save = () => {
        setStringParam(botName + WIRED_STRING_DELIMETER + message);
        setIntParams([talkMode, bubbleWidth, hideBotName ? 1 : 0]);
        setSourceTypes({ furni: [], users: toAvatar ? [botSource, userSource] : [botSource] });
    };

    useEffect(() => {
        if (!trigger) return;

        const data = (trigger.stringData ?? '').split(WIRED_STRING_DELIMETER);

        setBotName(data[0] ?? '');
        setMessage(data[1] ?? '');
        setTalkMode(trigger.intData?.[0] ?? (toAvatar ? 1 : 0));
        setBubbleWidth(trigger.intData?.[1] ?? -1);
        setHideBotName(trigger.intData?.[2] === 1);
        setBotSource(normalizeBotSource(slotUserSource(trigger, 0, 100)));
        setUserSource(slotUserSource(trigger, 1));
    }, [toAvatar, trigger]);

    const modes = toAvatar
        ? [
              { value: 1, label: 'wiredfurni.params.whisper' },
              { value: 0, label: 'wiredfurni.params.talk' }
          ]
        : [
              { value: 0, label: 'wiredfurni.params.talk' },
              { value: 1, label: 'wiredfurni.params.shout' }
          ];

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <WiredSourcesSelector
                        showUsers={true}
                        userSource={botSource}
                        userSources={BOT_SOURCES}
                        usersTitle="wiredfurni.params.sources.users.title.bots"
                        onChangeUsers={(value) => setBotSource(normalizeBotSource(value))}
                    />
                    {toAvatar && (
                        <>
                            <hr className="m-0 bg-dark" />
                            <WiredSourcesSelector showUsers={true} userSlot={1} userSource={userSource} onChangeUsers={setUserSource} />
                        </>
                    )}
                </div>
            }
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.bot.name')}</Text>
                <OctaneInput maxLength={32} title={LocalizeText('wiredfurni.tooltip.bot.name')} type="text" value={botName} onChange={(event) => setBotName(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.message')}</Text>
                <textarea
                    className="form-control form-control-sm octane-wired__resizable-textarea"
                    maxLength={MESSAGE_MAX_LENGTH}
                    rows={4}
                    title={LocalizeText('wiredfurni.tooltip.bot.chatmessage')}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                />
                <WiredTextCounter maxLength={MESSAGE_MAX_LENGTH} value={message} />
                <WiredPlaceholderInsert trigger={trigger} onInsert={(token) => setMessage((current) => (current + token).slice(0, MESSAGE_MAX_LENGTH))} />
                <WiredTextFormattingHelp />
                {modes.map((mode) => (
                    <label key={mode.value} className="flex items-center gap-1">
                        <Radio checked={talkMode === mode.value} name="botTalkMode" onCheckedChange={() => setTalkMode(mode.value)} />
                        <Text>{LocalizeText(mode.label)}</Text>
                    </label>
                ))}
                <label className="flex items-center gap-1">
                    <Checkbox checked={hideBotName} onCheckedChange={(nextChecked) => setHideBotName(nextChecked)} />
                    <Text>{localizeWithFallback('wiredfurni.params.bot_talk.hide_bot_name', 'Hide the bot name')}</Text>
                </label>
            </div>
            <CollapsibleSection title={<Text bold>{localizeWithFallback('wiredfurni.params.show_message.bubble_width.title', 'Bubble width')}</Text>}>
                <WiredBubbleWidthSelect value={bubbleWidth} onChange={setBubbleWidth} />
            </CollapsibleSection>
        </WiredActionBaseView>
    );
};
