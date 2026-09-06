import { FC, useEffect, useRef } from 'react';
import { LayoutAvatarImageView } from '../../../../common';
import { MentionSuggestion } from '../../../../hooks/rooms/widgets/useChatMentions.helpers';

interface ChatInputMentionSelectorViewProps {
    suggestions: MentionSuggestion[];
    selectedIndex: number;
    onSelect: (suggestion: MentionSuggestion) => void;
    onHover: (index: number) => void;
}

/**
 * @-mention autocomplete popover. Wears the Habbo OctaneCard chrome: cream
 * cardstock, habbo-blue header, UbuntuCondensed names, kind chips and the
 * custom Habbo scrollbar.
 */
export const ChatInputMentionSelectorView: FC<ChatInputMentionSelectorViewProps> = (props) => {
    const { suggestions = [], selectedIndex = 0, onSelect = null, onHover = null } = props;
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!listRef.current) return;

        const selected = listRef.current.children[selectedIndex] as HTMLElement;

        if (selected) selected.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    if (suggestions.length === 0) return null;

    return (
        <div className="chat-input-mention-popover">
            <div className="chat-input-mention-popover-header">
                <span className="chat-input-mention-popover-header-dot" aria-hidden />
                <span>@ Mention</span>
            </div>
            <div ref={listRef} className="chat-input-mention-popover-list has-classic-scrollbar">
                {suggestions.map((suggestion, index) => {
                    const isSelected = index === selectedIndex;
                    const rowClass = ['chat-input-mention-row', isSelected ? 'is-selected' : ''].filter(Boolean).join(' ');

                    return (
                        <div key={suggestion.key} className={rowClass} onClick={() => onSelect(suggestion)} onMouseEnter={() => onHover(index)}>
                            {suggestion.kind === 'user' && suggestion.figure ? (
                                <div className="chat-input-mention-row-tile">
                                    <LayoutAvatarImageView figure={suggestion.figure} direction={2} headOnly />
                                </div>
                            ) : (
                                <div className="chat-input-mention-row-tile is-alias">@</div>
                            )}
                            <div className="chat-input-mention-row-body">
                                <span className="chat-input-mention-row-name">@{suggestion.name}</span>
                                {suggestion.description && <span className="chat-input-mention-row-desc">{suggestion.description}</span>}
                            </div>
                            <span className={`chat-input-mention-row-kind ${suggestion.kind === 'alias' ? 'is-alias' : ''}`}>
                                {suggestion.kind === 'alias' ? 'Broadcast' : 'User'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
