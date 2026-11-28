import { FC, MouseEvent, ReactNode } from 'react';
import { localizeWithFallback } from '../../../../api/utils/localizeWithFallback';
import { BaseButton } from '../../../../common/BaseButton';
import { ToggleButton } from '../../../../common/ToggleButton';
import type { HandheldChatMode } from '../../../../state/handheldChatComposerStore';

interface HandheldChatComposerViewProps {
    mode: HandheldChatMode;
    onModeChange: (mode: HandheldChatMode) => void;
    /** Who a whisper goes to; empty while nobody is chosen. */
    recipient: string;
    /** The other players in the room, for the recipient list. */
    candidates: readonly string[];
    recipientListOpen: boolean;
    onRecipientListToggle: () => void;
    onRecipientChange: (name: string) => void;
    canSend: boolean;
    onSend: () => void;
    onClose: () => void;
    /** The chat style chooser's trigger (left end of the field). */
    styleSelector: ReactNode;
    /** The text field, or the flood notice in its place. */
    field: ReactNode;
    /** The habbicon and emoji triggers (right of the text). */
    pickers: ReactNode;
    /** The command and mention suggestions, which open above the composer. */
    suggestions: ReactNode;
}

const MODES: readonly { mode: HandheldChatMode; key: string; fallback: string }[] = [
    { mode: 'say', key: 'widgets.chatinput.say', fallback: 'Say' },
    { mode: 'shout', key: 'widgets.chatinput.shout', fallback: 'Shout' },
    { mode: 'whisper', key: 'infostand.button.whisper', fallback: 'Whisper' }
];

/** A tap on a composer button must not take the cursor out of the field, or the phone would drop its keyboard. */
const keepFieldFocus = (event: MouseEvent) => event.preventDefault();

/**
 * The phone's room chat composer: a band across the bottom of the screen with the send mode on top (say, shout,
 * whisper, and the close button) and the field under it (chat style, text, habbicons and emoji, send). It only lays
 * the parts out; the chat input view owns the text, the sending and the pickers, exactly as on desktop.
 */
export const HandheldChatComposerView: FC<HandheldChatComposerViewProps> = (props) => {
    const { mode, onModeChange, recipient, candidates, recipientListOpen, onRecipientListToggle, onRecipientChange, canSend, onSend, onClose, styleSelector, field, pickers, suggestions } = props;
    const whisperTitle = localizeWithFallback('octane.handheld.chat.recipient', 'Whisper to');

    return (
        <div className="octane-handheld-composer" data-mode={mode}>
            <div className="octane-handheld-composer__column">
                {suggestions}
                {recipientListOpen && (
                    <div className="octane-handheld-composer__recipients">
                        <span className="octane-handheld-composer__recipients-title">{whisperTitle}</span>
                        {candidates.length > 0 ? (
                            <div className="octane-handheld-composer__recipients-list" role="listbox" aria-label={whisperTitle}>
                                {candidates.map((name) => (
                                    <BaseButton
                                        key={name}
                                        type="button"
                                        role="option"
                                        aria-selected={name === recipient}
                                        className="octane-handheld-composer__recipients-item"
                                        onMouseDown={keepFieldFocus}
                                        onClick={() => onRecipientChange(name)}
                                    >
                                        <span>{name}</span>
                                    </BaseButton>
                                ))}
                            </div>
                        ) : (
                            <span className="octane-handheld-composer__recipients-empty">{localizeWithFallback('octane.handheld.chat.recipient_none', 'Nobody else is in the room')}</span>
                        )}
                    </div>
                )}
                <div className="octane-handheld-composer__top">
                    <div className="octane-handheld-composer__modes" role="group" aria-label={localizeWithFallback('octane.handheld.chat.mode', 'Chat mode')}>
                        {MODES.map((entry) => (
                            <ToggleButton
                                key={entry.mode}
                                type="button"
                                className="octane-handheld-composer__mode"
                                data-mode={entry.mode}
                                data-needs-recipient={entry.mode === 'whisper' && !recipient ? 'true' : undefined}
                                pressed={mode === entry.mode}
                                onMouseDown={keepFieldFocus}
                                onClick={() => onModeChange(entry.mode)}
                            >
                                <span>{localizeWithFallback(entry.key, entry.fallback)}</span>
                            </ToggleButton>
                        ))}
                    </div>
                    {mode === 'whisper' && (
                        <BaseButton
                            type="button"
                            className="octane-handheld-composer__recipient"
                            aria-expanded={recipientListOpen}
                            aria-label={recipient ? localizeWithFallback('octane.handheld.chat.whisper_to', 'Whisper to %name%', ['name'], [recipient]) : whisperTitle}
                            onMouseDown={keepFieldFocus}
                            onClick={onRecipientListToggle}
                        >
                            <span className="octane-handheld-composer__recipient-name">{recipient || localizeWithFallback('octane.handheld.chat.recipient_choose', 'Choose')}</span>
                            <svg aria-hidden="true" viewBox="0 0 8 5">
                                <path d="M0 5 H8 L4 0 Z" />
                            </svg>
                        </BaseButton>
                    )}
                    <BaseButton type="button" className="octane-handheld-composer__close" aria-label={localizeWithFallback('octane.handheld.hud.chat_close', 'Close chat')} onClick={onClose}>
                        <svg aria-hidden="true" viewBox="0 0 12 12">
                            <path d="M2 2 L10 10 M10 2 L2 10" />
                        </svg>
                    </BaseButton>
                </div>
                <div className="octane-handheld-composer__pill">
                    {styleSelector}
                    {field}
                    {pickers}
                    <BaseButton type="button" className="octane-handheld-composer__send" disabled={!canSend} onMouseDown={keepFieldFocus} onClick={onSend}>
                        <span>{localizeWithFallback('generic.send', 'Send')}</span>
                    </BaseButton>
                </div>
            </div>
        </div>
    );
};
