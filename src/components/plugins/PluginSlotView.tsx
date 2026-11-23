import { CSSProperties, FC, useEffect, useRef, useSyncExternalStore } from 'react';
import { getPluginSlotEntries, PluginSlotEntry, subscribePluginSlots } from '../../api';

/** One plugin's host in a slot: filled once mounted, emptied when the plugin leaves or the window closes. */
const PluginSlotHost: FC<{ entry: PluginSlotEntry; slot: string }> = ({ entry, slot }) => {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;

        if (!host) return;

        let cleanup: (() => void) | void;

        try {
            cleanup = entry.mount(host);
        } catch (error) {
            console.error(`[plugin-slots] a plugin failed to draw in ${slot}`, error);
        }

        return () => {
            try {
                if (typeof cleanup === 'function') cleanup();
            } catch (error) {
                console.error(`[plugin-slots] a plugin failed to leave ${slot}`, error);
            }

            host.replaceChildren();
        };
    }, [entry, slot]);

    return <div ref={hostRef} className="plugin-slot__host" />;
};

export interface PluginSlotViewProps {
    slot: string;
    className?: string;
    style?: CSSProperties;
    /** The height of what the plugins drew, each time it changes; 0 while the slot is empty. */
    onHeight?: (height: number) => void;
}

/** Where external plugins draw in one of the client's windows (see `registerSlot` on `window.OctanePlugins`). */
export const PluginSlotView: FC<PluginSlotViewProps> = ({ slot, className, style, onHeight }) => {
    const entries = useSyncExternalStore(subscribePluginSlots, () => getPluginSlotEntries(slot));
    const rootRef = useRef<HTMLDivElement>(null);
    const onHeightRef = useRef(onHeight);

    useEffect(() => {
        onHeightRef.current = onHeight;
    }, [onHeight]);

    useEffect(() => {
        const root = rootRef.current;

        if (!root) {
            onHeightRef.current?.(0);
            return;
        }

        const report = () => onHeightRef.current?.(Math.ceil(root.getBoundingClientRect().height));

        report();

        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(report);

        observer.observe(root);

        return () => observer.disconnect();
    }, [entries.length]);

    if (!entries.length) return null;

    return (
        <div ref={rootRef} className={`plugin-slot${className ? ` ${className}` : ''}`} data-plugin-slot={slot} style={style}>
            {entries.map((entry) => (
                <PluginSlotHost key={entry.id} entry={entry} slot={slot} />
            ))}
        </div>
    );
};
