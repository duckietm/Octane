import { CreateLinkEvent, GetSessionDataManager, HabboClubLevelEnum, SecurityLevel } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ChatStyleConfigEntry,
    GetClubMemberLevel,
    GetConfigurationValue,
    HasSessionPermission,
    resolveServerLength,
    LocalizeText,
    localizeWithFallback,
    ResolveChatStyleIds,
    RoomWidgetUpdateChatInputContentEvent
} from '../../../../api';
import { Text } from '../../../../common';
import { useHotelSettingsStore } from '../../../../state/hotelSettingsStore';
import { BaseButton } from '../../../../common/BaseButton';
import {
    closeHandheldChatLine,
    openHandheldWhisper,
    useChatCommandSelector,
    useChatDraft,
    useChatInputWidget,
    useChatMentions,
    useHandheldChatMode,
    useIsHandheld,
    useNuxChatReminder,
    usePurchasableChatStyles,
    useRoom,
    useRoomUserListSnapshot,
    useSessionInfo,
    useUiEvent
} from '../../../../hooks';
import { applyComposerMode, parseChatSubmission } from '../../../../hooks/rooms/widgets/chatInputSubmission';
import type { HandheldChatMode } from '../../../../state/handheldChatComposerStore';
import { ChatInputCommandSelectorView } from './ChatInputCommandSelectorView';
import { ChatInputEmojiSelectorView } from './ChatInputEmojiSelectorView';
import { ChatInputHabbiconSelectorView } from './ChatInputHabbiconSelectorView';
import { ChatInputMentionSelectorView } from './ChatInputMentionSelectorView';
import { ChatInputStyleSelectorView } from './ChatInputStyleSelectorView';
import { HandheldChatComposerView } from './HandheldChatComposerView';

/** RoomObjectType.USER: the entries of the room's unit list that are people. */
const UNIT_TYPE_PERSON = 1;

export const ChatInputView: FC<{}> = (props) => {
    // The phone composer keeps its text in a store (it survives being closed); the desktop field keeps its own.
    const [chatValue, setChatValue] = useChatDraft();
    const isHandheld = useIsHandheld();
    const { mode: composerMode, recipient: whisperRecipient, setMode: setComposerMode, setRecipient: setWhisperRecipient } = useHandheldChatMode();
    const [recipientListOpen, setRecipientListOpen] = useState(false);
    const roomUsers = useRoomUserListSnapshot();
    const [portalTarget, setPortalTarget] = useState<HTMLElement>(null);
    const { chatStyleId = 0, updateChatStyleId = null } = useSessionInfo();
    const ownedPurchasableStyleIds = usePurchasableChatStyles();
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
    const nuxReminder = useNuxChatReminder(chatValue.length > 0);

    const chatModeIdWhisper = useMemo(() => LocalizeText('widgets.chatinput.mode.whisper'), []);
    const chatModeIdShout = useMemo(() => LocalizeText('widgets.chatinput.mode.shout'), []);
    const chatModeIdSpeak = useMemo(() => LocalizeText('widgets.chatinput.mode.speak'), []);
    const hotelSettings = useHotelSettingsStore((state) => state.settings);
    const maxChatLength = useMemo(() => resolveServerLength(hotelSettings, 'chatMaxLength', GetConfigurationValue<number>('chat.input.maxlength', 100)), [hotelSettings]);

    const ownRoomIndex = roomSession?.ownRoomIndex ?? -1;
    const whisperCandidates = useMemo(
        () => (isHandheld ? roomUsers.filter((user) => user.type === UNIT_TYPE_PERSON && user.roomIndex !== ownRoomIndex && !!user.name).map((user) => user.name) : []),
        [isHandheld, roomUsers, ownRoomIndex]
    );

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

            let submission = parseChatSubmission(value, { whisper: chatModeIdWhisper, shout: chatModeIdShout, speak: chatModeIdSpeak }, shiftKey);

            if (isHandheld) {
                // The composer's segment decides how a line without a keyword goes out. A whisper with nobody to
                // go to (never chosen, or no longer in the room) asks for a recipient first and keeps the text.
                const recipientGone = whisperCandidates.length > 0 && !whisperCandidates.includes(whisperRecipient);
                const moded = applyComposerMode(submission, composerMode, recipientGone ? '' : whisperRecipient);

                if (!moded) {
                    setRecipientListOpen(true);
                    return;
                }

                submission = moded;
            }

            const { text, chatType, recipientName, append } = submission;

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
        [
            chatModeIdWhisper,
            chatModeIdShout,
            chatModeIdSpeak,
            maxChatLength,
            chatStyleId,
            setIsTyping,
            setIsIdle,
            sendChat,
            setChatValue,
            isHandheld,
            composerMode,
            whisperRecipient,
            whisperCandidates
        ]
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
                if (isHandheld) {
                    // The phone composer whispers through its mode, so the draft stays free of keywords.
                    setRecipientListOpen(false);
                    openHandheldWhisper(event.userName);
                    return;
                }

                setChatValue(`${chatModeIdWhisper} ${event.userName} `);
                return;
            }
            case RoomWidgetUpdateChatInputContentEvent.SHOUT:
                return;
        }
    });

    const chatStyleIds = useMemo(
        () =>
            ResolveChatStyleIds(GetConfigurationValue<ChatStyleConfigEntry[]>('chat.styles'), {
                hasSecurity: (rank) => GetSessionDataManager().hasSecurity(rank),
                canUseSystemStyles: HasSessionPermission('acc_anychatcolor', SecurityLevel.MODERATOR),
                disabledStyleIds: GetConfigurationValue<number[]>('chat.styles.disabled') ?? [],
                isClubMember: GetClubMemberLevel() >= HabboClubLevelEnum.CLUB,
                isAmbassador: GetSessionDataManager().isAmbassador,
                ownedPurchasableStyleIds
            }),
        [ownedPurchasableStyleIds]
    );

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

    const suggestions = (
        <>
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
        </>
    );
    const floodNotice = LocalizeText('chat.input.alert.flood', ['time'], [floodBlockedSeconds.toString()]);
    const defaultPlaceholder = nuxReminder.reminding ? LocalizeText('widgets.chatinput.mode.remind.noobie') : LocalizeText('widgets.chatinput.default');

    if (isHandheld) {
        const chooseMode = (next: HandheldChatMode) => {
            const wasWhisper = composerMode === 'whisper';

            setComposerMode(next);

            if (next !== 'whisper') {
                setRecipientListOpen(false);
                return;
            }

            // Tapping the chosen segment again opens the list to change who it goes to.
            if (wasWhisper) {
                setRecipientListOpen((open) => !open);
                return;
            }

            // The avatar that is selected in the room comes first, then whoever was whispered to last.
            if (selectedUsername.length && whisperCandidates.includes(selectedUsername)) {
                setWhisperRecipient(selectedUsername);
                return;
            }

            if (!whisperRecipient || (whisperCandidates.length > 0 && !whisperCandidates.includes(whisperRecipient))) setRecipientListOpen(true);
        };

        return createPortal(
            <HandheldChatComposerView
                mode={composerMode}
                onModeChange={chooseMode}
                recipient={whisperRecipient}
                candidates={whisperCandidates}
                recipientListOpen={recipientListOpen}
                onRecipientListToggle={() => setRecipientListOpen((open) => !open)}
                onRecipientChange={(name) => {
                    setWhisperRecipient(name);
                    setRecipientListOpen(false);
                }}
                canSend={!floodBlocked}
                onSend={() => {
                    sendChatValue(chatValue);
                    inputRef.current?.focus();
                }}
                onClose={() => {
                    setIsTyping(false);
                    setRecipientListOpen(false);
                    closeHandheldChatLine();
                }}
                styleSelector={<ChatInputStyleSelectorView chatStyleId={chatStyleId} chatStyleIds={chatStyleIds} selectChatStyleId={updateChatStyleId} />}
                field={
                    floodBlocked ? (
                        <div className="octane-handheld-composer__flood" role="status">
                            <span>{floodNotice}</span>
                        </div>
                    ) : (
                        <input
                            ref={inputRef}
                            className="octane-handheld-composer__input"
                            autoCapitalize="sentences"
                            autoComplete="off"
                            enterKeyHint="send"
                            maxLength={maxChatLength}
                            placeholder={
                                composerMode === 'whisper' && whisperRecipient
                                    ? localizeWithFallback('octane.handheld.chat.whisper_to', 'Whisper to %name%', ['name'], [whisperRecipient])
                                    : defaultPlaceholder
                            }
                            type="text"
                            value={chatValue}
                            onChange={(event) => updateChatInput(event.target.value)}
                            onFocus={() => nuxReminder.dismiss()}
                        />
                    )
                }
                pickers={
                    <>
                        <ChatInputHabbiconSelectorView />
                        <ChatInputEmojiSelectorView addChatEmoji={addChatEmoji} />
                    </>
                }
                suggestions={suggestions}
            />,
            portalTarget
        );
    }

    return createPortal(
        // justify-start, not between: the style trigger overlaps the bubble's pointed
        // left cap via a negative margin. With justify-between, hiding an optional
        // trailing button (habbicons disabled) redistributes the slack between the
        // trigger and the bubble, exposing the cap and opening a gap.
        <div className={`octane-chat-input-container swf-chat-input relative flex w-full items-center justify-start overflow-visible ${nuxReminder.wiggling ? 'is-nux-reminder' : ''}`}>
            {nuxReminder.wiggling && <div className="octane-nux-chat-hint">{LocalizeText('widgets.chatinput.mode.remind.noobie')}</div>}
            {suggestions}
            <ChatInputStyleSelectorView chatStyleId={chatStyleId} chatStyleIds={chatStyleIds} selectChatStyleId={updateChatStyleId} />
            {!floodBlocked && (
                <div className="flex-1 items-center input-sizer swf-chat-input-sizer">
                    <input
                        ref={inputRef}
                        className="swf-chat-input-field w-full border-none bg-transparent"
                        maxLength={maxChatLength}
                        placeholder={defaultPlaceholder}
                        type="text"
                        value={chatValue}
                        onChange={(event) => updateChatInput(event.target.value)}
                        onFocus={() => nuxReminder.dismiss()}
                        onMouseDown={(event) => setInputFocus()}
                    />
                </div>
            )}
            {floodBlocked && (
                <div className="swf-chat-flood flex min-w-0 flex-1 items-center">
                    <Text variant="danger" className="w-full truncate whitespace-nowrap text-[0.8rem] font-bold leading-none">
                        {floodNotice}
                    </Text>
                </div>
            )}
            <ChatInputHabbiconSelectorView />
            <ChatInputEmojiSelectorView addChatEmoji={addChatEmoji} />
            {/* Official RoomChatInputView: a help button, shown while the pointer is over the input, opens the
                chat commands page. */}
            <BaseButton
                aria-label={localizeWithFallback('widgets.chatinput.help', 'Chat commands')}
                className="swf-chat-help-button"
                onClick={() => CreateLinkEvent('habbopages/chat/commands')}
            >
                ?
            </BaseButton>
        </div>,
        portalTarget
    );
};
