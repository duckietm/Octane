import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredActionLayoutCode, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredTextCounter, WiredTextFormattingHelp } from '../common/WiredTextFormattingHelp';
import { WiredBubbleWidthSelect } from '../WiredBubbleWidthSelect';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { WiredPlaceholderInsert } from '../WiredPlaceholderInsert';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';
import { CollapsibleSection } from '../../../../common/CollapsibleSection';

const SHOW_MESSAGE_STYLE_IDS = [34, 200, 201, 202, 210, 211, 212, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 250, 251, 252];
const DEFAULT_SHOW_MESSAGE_STYLE_ID = 34;
const SHOW_MESSAGE_MAX_LENGTH = 400;
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
const FIELDS: Record<number, { key: string; fallback: string; numeric?: boolean; multiline?: boolean; maxLength?: number }> = {
    [WiredActionLayoutCode.EFFECT_AMOUNT]: { key: 'wiredfurni.params.amount', fallback: 'Amount', numeric: true },
    [WiredActionLayoutCode.EFFECT_BADGE]: { key: 'wiredfurni.params.badgecode', fallback: 'Badge code', maxLength: 50 },
    [WiredActionLayoutCode.EFFECT_TAG]: { key: 'wiredfurni.params.tag', fallback: 'Tag', maxLength: 38 },
    [WiredActionLayoutCode.GIVE_HAND_ITEM]: { key: 'wiredfurni.params.id', fallback: 'Id', numeric: true },
    [WiredActionLayoutCode.EFFECT_MESSAGE]: { key: 'wiredfurni.params.message', fallback: 'Message', multiline: true },
    [WiredActionLayoutCode.EFFECT_TEXT]: { key: 'wiredfurni.params.value', fallback: 'Value', maxLength: 200 }
};

export const WiredActionChatView: FC<{}> = (props) => {
    const [message, setMessage] = useState('');
    const [visibilitySelection, setVisibilitySelection] = useState<number>(0);
    const [bubbleStyle, setBubbleStyle] = useState<number>(DEFAULT_SHOW_MESSAGE_STYLE_ID);
    const [bubbleWidth, setBubbleWidth] = useState<number>(-1);
    const { trigger = null, setStringParam = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger));
    const bubbleStyleIds = useMemo(() => SHOW_MESSAGE_STYLE_IDS, []);
    /** Undefined for the three chat effects, which keep the composer as it is. */
    const field = FIELDS[trigger?.code];
    const isChat = !field;
    const maxMessageLength = SHOW_MESSAGE_MAX_LENGTH;

    const save = () => {
        // Slots 1 and 2 keep their places so nothing about how these effects store changes; the two
        // controls that fill them simply stop being offered where they mean nothing.
        setStringParam(isChat || field.multiline ? clampShowMessage(message) : message);
        // Official show message layout: [visibility, style, bubble width]; the effect boxes that share
        // this window read no width. The user source is the official source slot.
        setIntParams(isChat ? [visibilitySelection, bubbleStyle, bubbleWidth] : [visibilitySelection, bubbleStyle]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setMessage(FIELDS[trigger?.code] && !FIELDS[trigger.code].multiline ? (trigger.stringData ?? '') : clampShowMessage(trigger.stringData));
        setUserSource(slotUserSource(trigger));
        setVisibilitySelection(trigger.intData?.[0] ?? 0);
        if (SHOW_MESSAGE_STYLE_IDS.includes(trigger.intData?.[1])) setBubbleStyle(trigger.intData[1]);
        else setBubbleStyle(DEFAULT_SHOW_MESSAGE_STYLE_ID);
        setBubbleWidth(trigger.intData?.[2] ?? -1);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            {isChat && <Text small>{localizeWithFallback('wiredfurni.params.show_message.usage_info', '')}</Text>}
            <div className="flex flex-col gap-1">
                <Text bold>{field ? localizeWithFallback(field.key, field.fallback) : LocalizeText('wiredfurni.params.message')}</Text>
                {!field || field.multiline ? (
                    <>
                        <textarea
                            className="form-control form-control-sm octane-wired__resizable-textarea"
                            maxLength={maxMessageLength}
                            rows={4}
                            value={message}
                            onChange={(event) => setMessage(clampShowMessage(event.target.value))}
                        />
                        <WiredTextCounter maxLength={maxMessageLength} value={message} />
                        {isChat && <WiredPlaceholderInsert trigger={trigger} onInsert={(token) => setMessage((current) => clampShowMessage(current + token))} />}
                        {isChat && <WiredTextFormattingHelp />}
                    </>
                ) : (
                    <OctaneInput
                        maxLength={field.maxLength}
                        type={field.numeric ? 'number' : 'text'}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                    />
                )}
            </div>
            {isChat && (
                <>
                    <CollapsibleSection className="flex flex-col gap-1" title={<Text bold>{LocalizeText('wiredfurni.params.show_message.visibility_selection.title')}</Text>}>
                        <div className="flex items-center gap-1">
                            <Radio checked={visibilitySelection === 0} name="showMessageVisibilitySelection" onCheckedChange={() => setVisibilitySelection(0)} />
                            <Text>{LocalizeText('wiredfurni.params.show_message.visibility_selection.0')}</Text>
                        </div>
                        <div className="flex items-center gap-1">
                            <Radio checked={visibilitySelection === 1} name="showMessageVisibilitySelection" onCheckedChange={() => setVisibilitySelection(1)} />
                            <Text>{LocalizeText('wiredfurni.params.show_message.visibility_selection.1')}</Text>
                        </div>
                    </CollapsibleSection>
                    <CollapsibleSection className="flex flex-col gap-1" title={<Text bold>{LocalizeText('wiredfurni.params.show_message.style_selection.title')}</Text>}>
                        <div className="flex items-center gap-2">
                            <div className="bubble-container relative w-[50px] shrink-0">
                                <div className={`relative min-h-[26px] chat-bubble bubble-${bubbleStyle}`} />
                            </div>
                            <Select className="form-select form-select-sm" value={bubbleStyle} onChange={(event) => setBubbleStyle(Number(event.target.value))}>
                                {bubbleStyleIds.map((styleId) => (
                                    <option key={styleId} value={styleId}>
                                        {LocalizeText(`wiredfurni.params.show_message.style_selection.${styleId}`)}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </CollapsibleSection>
                    <CollapsibleSection title={<Text bold>{LocalizeText('wiredfurni.params.show_message.bubble_width.title')}</Text>}>
                        <WiredBubbleWidthSelect value={bubbleWidth} onChange={setBubbleWidth} />
                    </CollapsibleSection>
                </>
            )}
        </WiredActionBaseView>
    );
};
