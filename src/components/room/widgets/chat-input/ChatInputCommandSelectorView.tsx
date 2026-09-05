import { FC, useEffect, useRef } from 'react';
import { CommandDefinition } from '../../../../api';

interface ChatInputCommandSelectorViewProps {
    commands: CommandDefinition[];
    selectedIndex: number;
    onSelect: (command: CommandDefinition) => void;
    onHover: (index: number) => void;
}

/**
 * :command autocomplete popover. Wears the Habbo OctaneCard chrome: cream
 * cardstock, habbo-green header, UbuntuCondensed names, green ":" tile and
 * the custom Habbo scrollbar.
 */
export const ChatInputCommandSelectorView: FC<ChatInputCommandSelectorViewProps> = (props) => {
    const { commands = [], selectedIndex = 0, onSelect = null, onHover = null } = props;
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!listRef.current) return;

        const selected = listRef.current.children[selectedIndex] as HTMLElement;

        if (selected) selected.scrollIntoView({ block: 'nearest' });
    }, [selectedIndex]);

    return (
        <div className="chat-input-command-popover">
            <div className="chat-input-command-popover-header">
                <span className="chat-input-command-popover-header-dot" aria-hidden />
                <span>: Command</span>
            </div>
            <div ref={listRef} className="chat-input-command-popover-list has-classic-scrollbar">
                {commands.map((cmd, index) => {
                    const isSelected = index === selectedIndex;
                    const rowClass = ['chat-input-command-row', isSelected ? 'is-selected' : ''].filter(Boolean).join(' ');

                    return (
                        <div key={cmd.key} className={rowClass} onClick={() => onSelect(cmd)} onMouseEnter={() => onHover(index)}>
                            <div className="chat-input-command-row-tile">:</div>
                            <div className="chat-input-command-row-body">
                                <span className="chat-input-command-row-name">:{cmd.key}</span>
                                {cmd.description && <span className="chat-input-command-row-desc">{cmd.description}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
