import { GetSessionDataManager } from '@octane/renderer';
import { RefObject, useCallback, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../api';
import { useRoomUserListSnapshot } from '../../session/useSessionSnapshots';
import {
    buildChatMentionSuggestions,
    computeMentionContext,
    MENTION_ALIAS_CONFIG_KEY,
    MENTION_ALIAS_DEFAULTS,
    MENTION_ALIAS_DESCRIPTION_KEY,
    MentionAlias,
    MentionAliasScope,
    MentionSuggestion,
    sanitizeAliasList
} from './useChatMentions.helpers';

export type { MentionSuggestion, MentionSuggestionKind } from './useChatMentions.helpers';

export interface ChatMentionsState {
    visible: boolean;
    suggestions: MentionSuggestion[];
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    moveUp: () => void;
    moveDown: () => void;
    /** Apply the highlighted suggestion (or the first). Returns true if one was applied. */
    applyCurrent: () => boolean;
    apply: (suggestion: MentionSuggestion) => void;
    /** Escape: reset selection and strip the in-progress @query from the input. */
    cancel: () => void;
}

/**
 * Chat-input @-mention autocomplete. Owns the caret-context detection, the
 * config-driven broadcast aliases, the room-user suggestion list (minus the
 * viewer), keyboard navigation and the insert/cancel actions — so ChatInputView
 * just wires its keydown handler and the selector view to this hook.
 */
export const useChatMentions = (
    chatValue: string,
    setChatValue: (value: string) => void,
    inputRef: RefObject<HTMLInputElement>,
    commandSelectorVisible: boolean
): ChatMentionsState => {
    const roomUserList = useRoomUserListSnapshot();
    const [selectedIndex, setSelectedIndex] = useState(0);

    const mentionContext = useMemo(() => computeMentionContext(chatValue, commandSelectorVisible), [chatValue, commandSelectorVisible]);

    const aliases = useMemo<MentionAlias[]>(() => {
        const out: MentionAlias[] = [];
        const seen = new Set<string>();
        const scopes: MentionAliasScope[] = ['everyone', 'friends', 'room'];

        for (const scope of scopes) {
            const list = sanitizeAliasList(
                GetConfigurationValue<unknown>(MENTION_ALIAS_CONFIG_KEY[scope], MENTION_ALIAS_DEFAULTS[scope]),
                MENTION_ALIAS_DEFAULTS[scope]
            );

            for (const key of list) {
                const lower = key.toLowerCase();

                if (seen.has(lower)) continue;

                seen.add(lower);
                out.push({ key, scope, description: LocalizeText(MENTION_ALIAS_DESCRIPTION_KEY[scope]) });
            }
        }

        return out;
    }, []);

    const suggestions = useMemo<MentionSuggestion[]>(() => {
        if (!mentionContext) return [];

        const session = GetSessionDataManager();

        return buildChatMentionSuggestions(mentionContext.query, roomUserList, aliases, session?.userId ?? -1, session?.userName || '');
    }, [mentionContext, roomUserList, aliases]);

    const visible = suggestions.length > 0;
    // Clamp the selection to the current list (derived, no effect) so a
    // shrinking list never leaves the highlight out of range.
    const safeIndex = selectedIndex < suggestions.length ? selectedIndex : 0;

    const apply = useCallback(
        (suggestion: MentionSuggestion) => {
            if (!suggestion || !mentionContext) return;

            const before = chatValue.slice(0, mentionContext.replaceFrom);
            const after = chatValue.slice(mentionContext.replaceTo);
            const inserted = `@${suggestion.insertToken} `;

            setChatValue(`${before}${inserted}${after}`);

            requestAnimationFrame(() => {
                if (!inputRef.current) return;

                const caret = before.length + inserted.length;

                inputRef.current.focus();
                inputRef.current.setSelectionRange(caret, caret);
            });

            setSelectedIndex(0);
        },
        [chatValue, mentionContext, setChatValue, inputRef]
    );

    const moveUp = useCallback(() => setSelectedIndex(safeIndex <= 0 ? suggestions.length - 1 : safeIndex - 1), [safeIndex, suggestions.length]);
    const moveDown = useCallback(() => setSelectedIndex(safeIndex >= suggestions.length - 1 ? 0 : safeIndex + 1), [safeIndex, suggestions.length]);

    const applyCurrent = useCallback(() => {
        const picked = suggestions[safeIndex] ?? suggestions[0];

        if (!picked) return false;

        apply(picked);

        return true;
    }, [suggestions, safeIndex, apply]);

    const cancel = useCallback(() => {
        setSelectedIndex(0);

        if (!mentionContext) return;

        const before = chatValue.slice(0, mentionContext.replaceFrom);
        const after = chatValue.slice(mentionContext.replaceTo);

        setChatValue(before + after);
    }, [mentionContext, chatValue, setChatValue]);

    return { visible, suggestions, selectedIndex: safeIndex, setSelectedIndex, moveUp, moveDown, applyCurrent, apply, cancel };
};
