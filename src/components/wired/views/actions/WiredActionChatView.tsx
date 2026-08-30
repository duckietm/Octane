import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, LocalizeText, WiredActionLayoutCode, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { NitroInput } from '../../../../layout';
import { WiredTextCounter, WiredTextFormattingHelp } from '../common/WiredTextFormattingHelp';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const SHOW_MESSAGE_STYLE_IDS = [34, 200, 201, 202, 210, 211, 212, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 250, 251, 252];
const DEFAULT_SHOW_MESSAGE_STYLE_ID = 34;
const SHOW_MESSAGE_MAX_LENGTH = 200;
const SHOW_MESSAGE_MAX_LINES = 8;

const clampShowMessage = (value: string) => {
    const normalized = (value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n').slice(0, SHOW_MESSAGE_MAX_LINES);
    const joined = lines.join('\n');

    return joined.slice(0, SHOW_MESSAGE_MAX_LENGTH);
};

/**
 * Nineteen effects shared this window because they all store one string and a user source. Only the
 * three that make somebody speak read the bubble style and the visibility choice; for the rest those
 * two controls did nothing, and the message textarea held something that was never a message — an
 * amount, a badge code, a tag, a room or effect id, a figure, a link, a command.
 *
 * Each entry says what the box really holds. `chat` is the original composer.
 */
const FIELDS: Record<
    number,
    { key: string; fallback: string; numeric?: boolean; multiline?: boolean; maxLength?: number }
> = {
    [WiredActionLayoutCode.EFFECT_AMOUNT]: { key: 'wiredfurni.params.amount', fallback: 'Amount', numeric: true },
    [WiredActionLayoutCode.EFFECT_BADGE]: { key: 'wiredfurni.params.badgecode', fallback: 'Badge code', maxLength: 50 },
    [WiredActionLayoutCode.EFFECT_TAG]: { key: 'wiredfurni.params.tag', fallback: 'Tag', maxLength: 38 },
    [WiredActionLayoutCode.EFFECT_ID]: { key: 'wiredfurni.params.id', fallback: 'Id', numeric: true },
    [WiredActionLayoutCode.EFFECT_MESSAGE]: { key: 'wiredfurni.params.message', fallback: 'Message', multiline: true },
    [WiredActionLayoutCode.EFFECT_TEXT]: { key: 'wiredfurni.params.value', fallback: 'Value', maxLength: 200 }
};

export const WiredActionChatView: FC<{}> = (props) => {
    const [message, setMessage] = useState('');
    const [visibilitySelection, setVisibilitySelection] = useState<number>(0);
    const [bubbleStyle, setBubbleStyle] = useState<number>(DEFAULT_SHOW_MESSAGE_STYLE_ID);
    const { trigger = null, setStringParam = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length >= 1) return trigger.intData[0];
        return 0;
    });
    const bubbleStyleIds = useMemo(() => SHOW_MESSAGE_STYLE_IDS, []);
    /** Undefined for the three chat effects, which keep the composer as it is. */
    const field = FIELDS[trigger?.code];
    const isChat = !field;
    const maxMessageLength = SHOW_MESSAGE_MAX_LENGTH;

    const save = () => {
        // Slots 1 and 2 keep their places so nothing about how these effects store changes; the two
        // controls that fill them simply stop being offered where they mean nothing.
        setStringParam(isChat || field.multiline ? clampShowMessage(message) : message);
        setIntParams([userSource, visibilitySelection, bubbleStyle]);
    };

    useEffect(() => {
        setMessage(FIELDS[trigger?.code] && !FIELDS[trigger.code].multiline ? (trigger.stringData ?? '') : clampShowMessage(trigger.stringData));
        if (trigger.intData.length >= 1) setUserSource(trigger.intData[0]);
        else setUserSource(0);
        if (trigger.intData.length >= 2) setVisibilitySelection(trigger.intData[1]);
        else setVisibilitySelection(0);
        if (trigger.intData.length >= 3 && SHOW_MESSAGE_STYLE_IDS.includes(trigger.intData[2])) setBubbleStyle(trigger.intData[2]);
        else setBubbleStyle(DEFAULT_SHOW_MESSAGE_STYLE_ID);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{field ? localizeWithFallback(field.key, field.fallback) : LocalizeText('wiredfurni.params.message')}</Text>
                {!field || field.multiline ? (
                    <>
                        <textarea
                            className="form-control form-control-sm nitro-wired__resizable-textarea"
                            maxLength={maxMessageLength}
                            rows={4}
                            value={message}
                            onChange={(event) => setMessage(clampShowMessage(event.target.value))}
                        />
                        <WiredTextCounter maxLength={maxMessageLength} value={message} />
                        {isChat && <WiredTextFormattingHelp />}
                    </>
                ) : (
                    <NitroInput
                        maxLength={field.maxLength}
                        type={field.numeric ? 'number' : 'text'}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                )}
            </div>
            {isChat && (
                <>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.show_message.visibility_selection.title')}</Text>
                    <div className="flex items-center gap-1">
                        <input
                            checked={visibilitySelection === 0}
                            className="form-check-input"
                            name="showMessageVisibilitySelection"
                            type="radio"
                            onChange={() => setVisibilitySelection(0)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.show_message.visibility_selection.0')}</Text>
                    </div>
                    <div className="flex items-center gap-1">
                        <input
                            checked={visibilitySelection === 1}
                            className="form-check-input"
                            name="showMessageVisibilitySelection"
                            type="radio"
                            onChange={() => setVisibilitySelection(1)}
                        />
                        <Text>{LocalizeText('wiredfurni.params.show_message.visibility_selection.1')}</Text>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.show_message.style_selection.title')}</Text>
                    <div className="flex items-center gap-2">
                        <div className="bubble-container relative w-[50px] shrink-0">
                            <div className={`relative min-h-[26px] chat-bubble bubble-${bubbleStyle}`} />
                        </div>
                        <select className="form-select form-select-sm" value={bubbleStyle} onChange={(event) => setBubbleStyle(Number(event.target.value))}>
                            {bubbleStyleIds.map((styleId) => (
                                <option key={styleId} value={styleId}>
                                    {LocalizeText(`wiredfurni.params.show_message.style_selection.${styleId}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                </>
            )}
        </WiredActionBaseView>
    );
};
