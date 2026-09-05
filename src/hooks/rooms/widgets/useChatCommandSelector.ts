import { AvailableCommandsEvent, GetCommunication } from '@octane/renderer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CommandDefinition, LocalizeText } from '../../../api';
import { createOctaneStore } from '../../../state/createOctaneStore';
import { useMessageEvent } from '../../events';

// Client-only commands are static; safe to keep at module scope. The
// `descriptionKey` is a LocalizeText slot resolved at merge time so
// hotels in different locales see the right language.
const CLIENT_COMMANDS: { key: string; descriptionKey: string }[] = [
    // Room effects
    { key: 'shake', descriptionKey: 'chatcmd.client.shake' },
    { key: 'rotate', descriptionKey: 'chatcmd.client.rotate' },
    { key: 'zoom', descriptionKey: 'chatcmd.client.zoom' },
    { key: 'flip', descriptionKey: 'chatcmd.client.flip' },
    { key: 'iddqd', descriptionKey: 'chatcmd.client.iddqd' },
    { key: 'screenshot', descriptionKey: 'chatcmd.client.screenshot' },
    { key: 'togglefps', descriptionKey: 'chatcmd.client.togglefps' },
    // Expressions
    { key: 'd', descriptionKey: 'chatcmd.client.laugh' },
    { key: 'kiss', descriptionKey: 'chatcmd.client.kiss' },
    { key: 'jump', descriptionKey: 'chatcmd.client.jump' },
    { key: 'idle', descriptionKey: 'chatcmd.client.idle' },
    { key: 'sign', descriptionKey: 'chatcmd.client.sign' },
    // Room management
    { key: 'furni', descriptionKey: 'chatcmd.client.furni' },
    { key: 'chooser', descriptionKey: 'chatcmd.client.chooser' },
    { key: 'floor', descriptionKey: 'chatcmd.client.floor' },
    { key: 'bcfloor', descriptionKey: 'chatcmd.client.floor' },
    { key: 'pickall', descriptionKey: 'chatcmd.client.pickall' },
    { key: 'ejectall', descriptionKey: 'chatcmd.client.ejectall' },
    { key: 'settings', descriptionKey: 'chatcmd.client.settings' },
    // Info
    { key: 'client', descriptionKey: 'chatcmd.client.info' },
    { key: 'octane', descriptionKey: 'chatcmd.client.info' }
];

/**
 * Server-pushed command cache. Lives in a Zustand store (instead of
 * module-level `let` variables) so the React Compiler can analyze the
 * surrounding hook cleanly, and so a future test can `setState({…})`
 * a deterministic fixture without monkey-patching the module.
 *
 * The `isListenerRegistered` flag prevents the renderer from getting
 * two AvailableCommandsEvent listeners — one from the module-level
 * pre-mount registration (which captures the server's reply that lands
 * during login, BEFORE any React widget mounts) and one from the
 * in-hook `useMessageEvent` (which covers later rank-change refreshes).
 */
interface ChatCommandStore {
    serverCommands: CommandDefinition[];
    isListenerRegistered: boolean;
    setServerCommands: (commands: CommandDefinition[]) => void;
    markListenerRegistered: () => void;
}

const useChatCommandStore = createOctaneStore<ChatCommandStore>()((set) => ({
    serverCommands: [],
    isListenerRegistered: false,
    setServerCommands: (commands) => set({ serverCommands: commands }),
    markListenerRegistered: () => set({ isListenerRegistered: true })
}));

const ensureGlobalListener = (): void => {
    if (useChatCommandStore.getState().isListenerRegistered) return;

    try {
        const event = new AvailableCommandsEvent((event: AvailableCommandsEvent) => {
            const parser = event.getParser();
            useChatCommandStore.getState().setServerCommands(parser.commands.map((cmd) => ({ key: cmd.key, description: cmd.description })));
        });

        GetCommunication().registerMessageEvent(event);
        useChatCommandStore.getState().markListenerRegistered();
    } catch {
        // Communication not ready yet — the in-hook useMessageEvent
        // below covers later mounts.
    }
};

// Try once at module load so the server's response landing before any
// React mount still hits the cache.
ensureGlobalListener();

export const useChatCommandSelector = (chatValue: string) => {
    const serverCommands = useChatCommandStore((s) => s.serverCommands);
    const setServerCommands = useChatCommandStore((s) => s.setServerCommands);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Cover the case where the module-level registration failed
        // because GetCommunication() wasn't ready at import time.
        ensureGlobalListener();
    }, []);

    // Late updates (rank change, etc.) — go through the store so all
    // consumers see the same data.
    useMessageEvent<AvailableCommandsEvent>(AvailableCommandsEvent, (event) => {
        const parser = event.getParser();
        setServerCommands(parser.commands.map((cmd) => ({ key: cmd.key, description: cmd.description })));
    });

    const allCommands = useMemo(() => {
        const byKey = new Map<string, CommandDefinition>();

        for (const cmd of serverCommands) {
            if (!byKey.has(cmd.key)) byKey.set(cmd.key, cmd);
        }

        for (const clientCmd of CLIENT_COMMANDS) {
            if (byKey.has(clientCmd.key)) continue;
            byKey.set(clientCmd.key, { key: clientCmd.key, description: LocalizeText(clientCmd.descriptionKey) });
        }

        return [ ...byKey.values() ].sort((a, b) => a.key.localeCompare(b.key));
    }, [serverCommands]);

    const filterText = useMemo(() => {
        if (!chatValue.startsWith(':') || chatValue.includes(' ')) return '';

        return chatValue.slice(1).toLowerCase();
    }, [chatValue]);

    const filteredCommands = useMemo(() => {
        if (!filterText && !chatValue.startsWith(':')) return [];

        return allCommands.filter((cmd) => cmd.key.toLowerCase().startsWith(filterText));
    }, [allCommands, filterText, chatValue]);

    const isVisible = useMemo(() => {
        return chatValue.startsWith(':') && !chatValue.includes(' ') && filteredCommands.length > 0 && !dismissed;
    }, [chatValue, filteredCommands, dismissed]);

    const moveUp = useCallback(() => {
        setSelectedIndex((prev) => (prev <= 0 ? filteredCommands.length - 1 : prev - 1));
    }, [filteredCommands.length]);

    const moveDown = useCallback(() => {
        setSelectedIndex((prev) => (prev >= filteredCommands.length - 1 ? 0 : prev + 1));
    }, [filteredCommands.length]);

    const selectCurrent = useCallback((): CommandDefinition | null => {
        if (selectedIndex >= 0 && selectedIndex < filteredCommands.length) {
            return filteredCommands[selectedIndex];
        }

        return null;
    }, [selectedIndex, filteredCommands]);

    const close = useCallback(() => {
        setDismissed(true);
    }, []);

    // Reset dismissed when chatValue changes to a new command start
    useEffect(() => {
        if (chatValue === ':' || chatValue === '') setDismissed(false);
    }, [chatValue]);

    // Reset selectedIndex when filtered list changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [filterText]);

    return { isVisible, filteredCommands, selectedIndex, setSelectedIndex, moveUp, moveDown, selectCurrent, close };
};
