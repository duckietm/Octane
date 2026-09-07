import { GetSessionDataManager, HabboClubLevelEnum, RoomControllerLevel } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChatMessageTypeEnum, GetClubMemberLevel, GetConfigurationValue, LocalizeText, RoomWidgetUpdateChatInputContentEvent } from '../../../../api';
import { Text } from '../../../../common';
import { useChatCommandSelector, useChatInputWidget, useChatMentions, useRoom, useSessionInfo, useUiEvent } from '../../../../hooks';
import { ChatInputCommandSelectorView } from './ChatInputCommandSelectorView';
import { ChatInputEmojiSelectorView } from './ChatInputEmojiSelectorView';
import { ChatInputHabbiconSelectorView } from './ChatInputHabbiconSelectorView';
import { ChatInputMentionSelectorView } from './ChatInputMentionSelectorView';
import { ChatInputStyleSelectorView } from './ChatInputStyleSelectorView';

export const ChatInputView: FC<{}> = (props) => {
    const [chatValue, setChatValue] = useState<string>('');
    const [portalTarget, setPortalTarget] = useState<HTMLElement>(null);
    const { chatStyleId = 0, updateChatStyleId = null } = useSessionInfo();
    const {
        selectedUsername = '',
        floodBlocked = false,
        floodBlockedSeconds = 0,
        setIsTyping = null,
        setIsIdle = null,
        sendChat = null
    } = useChatInputWidget();
    const { roomSession = null } = useRoom();
    const inputRef = useRef<HTMLInputElement>(null);
    const {
        isVisible: commandSelectorVisible,
        filteredCommands,
        selectedIndex,
        setSelectedIndex,
        moveUp,
        moveDown,
        selectCurrent,
        close: closeCommandSelector
    } = useChatCommandSelector(chatValue);

    const mention = useChatMentions(chatValue, setChatValue, inputRef, commandSelectorVisible);

    const chatModeIdWhisper = useMemo(() => LocalizeText('widgets.chatinput.mode.whisper'), []);
    const chatModeIdShout = useMemo(() => LocalizeText('widgets.chatinput.mode.shout'), []);
    const chatModeIdSpeak = useMemo(() => LocalizeText('widgets.chatinput.mode.speak'), []);
    const maxChatLength = useMemo(() => GetConfigurationValue<number>('chat.input.maxlength', 100), []);

    const anotherInputHasFocus = useCallback(() => {
        const activeElement = document.activeElement;

        if (!activeElement) return false;

        if (inputRef && inputRef.current === activeElement) return false;

        if (!(activeElement instanceof HTMLInputElement) && !(activeElement instanceof HTMLTextAreaElement)) return false;

        return true;
    }, [inputRef]);

    const setInputFocus = useCallback(() => {
        inputRef.current.focus();

        inputRef.current.setSelectionRange(inputRef.current.value.length * 2, inputRef.current.value.length * 2);
    }, [inputRef]);

    const checkSpecialKeywordForInput = useCallback(() => {
        setChatValue((prevValue) => {
            if (prevValue !== chatModeIdWhisper || !selectedUsername.length) return prevValue;

            return `${prevValue} ${selectedUsername}`;
        });
    }, [selectedUsername, chatModeIdWhisper]);

    const sendChatValue = useCallback(
        (value: string, shiftKey: boolean = false) => {
            if (!value || value === '') return;

            let chatType = shiftKey ? ChatMessageTypeEnum.CHAT_SHOUT : ChatMessageTypeEnum.CHAT_DEFAULT;
            let text = value;

            const parts = text.split(' ');

            let recipientName = '';
            let append = '';

            switch (parts[0]) {
                case chatModeIdWhisper:
                    chatType = ChatMessageTypeEnum.CHAT_WHISPER;
                    recipientName = parts[1];
                    append = chatModeIdWhisper + ' ' + recipientName + ' ';

                    parts.shift();
                    parts.shift();
                    break;
                case chatModeIdShout:
                    chatType = ChatMessageTypeEnum.CHAT_SHOUT;

                    parts.shift();
                    break;
                case chatModeIdSpeak:
                    chatType = ChatMessageTypeEnum.CHAT_DEFAULT;

                    parts.shift();
                    break;
            }

            text = parts.join(' ');

            setIsTyping(false);
            setIsIdle(false);

            if (text.length <= maxChatLength) {
                if (/%CC%/g.test(encodeURIComponent(text))) {
                    setChatValue('');
                } else {
                    setChatValue('');
                    sendChat(text, chatType, recipientName, chatStyleId);
                }
            }

            setChatValue(append);
        },
        [chatModeIdWhisper, chatModeIdShout, chatModeIdSpeak, maxChatLength, chatStyleId, setIsTyping, setIsIdle, sendChat]
    );

    const updateChatInput = useCallback(
        (value: string) => {
            if (!value || !value.length) {
                setIsTyping(false);
            } else {
                setIsTyping(true);
                setIsIdle(true);
            }

            setChatValue(value);
        },
        [setIsTyping, setIsIdle]
    );

    const addChatEmoji = useCallback(
        (emoji: string) => {
            setChatValue((prev) => prev + emoji);
            setIsTyping(true);
            inputRef.current?.focus();
        },
        [setIsTyping, inputRef]
    );

    const onKeyDownEvent = useCallback(
        (event: KeyboardEvent) => {
            if (floodBlocked || !inputRef.current || anotherInputHasFocus()) return;

            if (document.activeElement !== inputRef.current) setInputFocus();

            if (commandSelectorVisible) {
                switch (event.key) {
                    case 'ArrowUp':
                        event.preventDefault();
                        moveUp();
                        return;
                    case 'ArrowDown':
                        event.preventDefault();
                        moveDown();
                        return;
                    case 'Tab':
                        event.preventDefault();
                    case 'NumpadEnter':
                    case 'Enter': {
                        const selected = selectCurrent();

                        if (selected) {
                            event.preventDefault();
                            setChatValue(':' + selected.key + ' ');
                            return;
                        }
                        break;
                    }
                    case 'Escape':
                        event.preventDefault();
                        closeCommandSelector();
                        return;
                }
            }

            if (mention.visible) {
                switch (event.key) {
                    case 'ArrowUp':
                        event.preventDefault();
                        mention.moveUp();
                        return;
                    case 'ArrowDown':
                        event.preventDefault();
                        mention.moveDown();
                        return;
                    case 'Tab':
                    case 'NumpadEnter':
                    case 'Enter':
                        if (mention.applyCurrent()) {
                            event.preventDefault();
                            return;
                        }
                        break;
                    case 'Escape':
                        event.preventDefault();
                        mention.cancel();
                        return;
                }
            }

            const value = (event.target as HTMLInputElement).value;

            switch (event.key) {
                case ' ':
                case 'Space':
                    checkSpecialKeywordForInput();
                    return;
                case 'NumpadEnter':
                case 'Enter':
                    sendChatValue(value, event.shiftKey);
                    return;
                case 'Backspace':
                    if (value) {
                        const parts = value.split(' ');

                        if (parts[0] === chatModeIdWhisper && parts.length === 3 && parts[2] === '') {
                            setChatValue('');
                        }
                    }
                    return;
            }
        },
        [
            floodBlocked,
            inputRef,
            chatModeIdWhisper,
            anotherInputHasFocus,
            setInputFocus,
            checkSpecialKeywordForInput,
            sendChatValue,
            commandSelectorVisible,
            moveUp,
            moveDown,
            selectCurrent,
            closeCommandSelector,
            mention,
            chatValue
        ]
    );

    useUiEvent<RoomWidgetUpdateChatInputContentEvent>(RoomWidgetUpdateChatInputContentEvent.CHAT_INPUT_CONTENT, (event) => {
        switch (event.chatMode) {
            case RoomWidgetUpdateChatInputContentEvent.TEXT:
                setChatValue(event.userName);
                inputRef.current?.focus();
                return;
            case RoomWidgetUpdateChatInputContentEvent.WHISPER: {
                setChatValue(`${chatModeIdWhisper} ${event.userName} `);
                return;
            }
            case RoomWidgetUpdateChatInputContentEvent.SHOUT:
                return;
        }
    });

    const chatStyleIds = useMemo(() => {
        let styleIds: number[] = [];

        const styles =
            GetConfigurationValue<{ styleId: number; minRank: number; isSystemStyle: boolean; isHcOnly: boolean; isAmbassadorOnly: boolean }[]>('chat.styles');

        for (const style of styles) {
            if (!style) continue;

            if (style.minRank > 0) {
                if (GetSessionDataManager().hasSecurity(style.minRank)) styleIds.push(style.styleId);

                continue;
            }

            if (style.isSystemStyle) {
                if (GetSessionDataManager().hasSecurity(RoomControllerLevel.MODERATOR)) {
                    styleIds.push(style.styleId);

                    continue;
                }
            }

            if (GetConfigurationValue<number[]>('chat.styles.disabled').indexOf(style.styleId) >= 0) continue;

            if (style.isHcOnly && GetClubMemberLevel() >= HabboClubLevelEnum.CLUB) {
                styleIds.push(style.styleId);

                continue;
            }

            if (style.isAmbassadorOnly && GetSessionDataManager().isAmbassador) {
                styleIds.push(style.styleId);

                continue;
            }

            if (!style.isHcOnly && !style.isAmbassadorOnly) styleIds.push(style.styleId);
        }

        return styleIds;
    }, []);

    useEffect(() => {
        document.body.addEventListener('keydown', onKeyDownEvent);

        return () => {
            document.body.removeEventListener('keydown', onKeyDownEvent);
        };
    }, [onKeyDownEvent]);

    useEffect(() => {
        if (!inputRef.current) return;

        inputRef.current.parentElement.dataset.value = chatValue;
    }, [chatValue]);

    useEffect(() => {
        if (!roomSession) return;

        if (portalTarget && portalTarget.isConnected) return;

        let frame = 0;

        const locate = () => {
            const target = document.getElementById('toolbar-chat-input-container');

            if (target) {
                setPortalTarget(target);
                return;
            }

            frame = window.requestAnimationFrame(locate);
        };

        locate();

        return () => window.cancelAnimationFrame(frame);
    }, [roomSession, portalTarget]);

    if (!roomSession || roomSession.isSpectator || !portalTarget) return null;

    return createPortal(
        // justify-start, not between: the style trigger overlaps the bubble's pointed
        // left cap via a negative margin. With justify-between, hiding an optional
        // trailing button (habbicons disabled) redistributes the slack between the
        // trigger and the bubble, exposing the cap and opening a gap.
        <div className="octane-chat-input-container swf-chat-input relative flex w-full items-center justify-start overflow-visible">
            {commandSelectorVisible && (
                <ChatInputCommandSelectorView
                    commands={filteredCommands}
                    selectedIndex={selectedIndex}
                    onSelect={(cmd) => {
                        setChatValue(':' + cmd.key + ' ');
                        inputRef.current?.focus();
                    }}
                    onHover={setSelectedIndex}
                />
            )}
            {mention.visible && !commandSelectorVisible && (
                <ChatInputMentionSelectorView
                    suggestions={mention.suggestions}
                    selectedIndex={mention.selectedIndex}
                    onSelect={mention.apply}
                    onHover={mention.setSelectedIndex}
                />
            )}
            <ChatInputStyleSelectorView chatStyleId={chatStyleId} chatStyleIds={chatStyleIds} selectChatStyleId={updateChatStyleId} />
            {!floodBlocked && (
                <div className="flex-1 items-center input-sizer swf-chat-input-sizer">
                    <input
                        ref={inputRef}
                        className="swf-chat-input-field w-full border-none bg-transparent"
                        maxLength={maxChatLength}
                        placeholder={LocalizeText('widgets.chatinput.default')}
                        type="text"
                        value={chatValue}
                        onChange={(event) => updateChatInput(event.target.value)}
                        onMouseDown={(event) => setInputFocus()}
                    />
                </div>
            )}
            {floodBlocked && (
                <div className="swf-chat-flood flex min-w-0 flex-1 items-center">
                    <Text variant="danger" className="w-full truncate whitespace-nowrap text-[0.8rem] font-bold leading-none">
                        {LocalizeText('chat.input.alert.flood', ['time'], [floodBlockedSeconds.toString()])}
                    </Text>
                </div>
            )}
            <ChatInputHabbiconSelectorView />
            <ChatInputEmojiSelectorView addChatEmoji={addChatEmoji} />
        </div>,
        portalTarget
    );
};
