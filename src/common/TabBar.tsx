import { Tabs } from '@base-ui/react/tabs';
import { CSSProperties, ReactNode, Ref } from 'react';

export interface TabBarProps {
    /** The selected tab's value, or null when no tab is selected. */
    value: string | number | null;
    className?: string;
    style?: CSSProperties;
    'aria-label'?: string;
    ref?: Ref<HTMLDivElement>;
    children?: ReactNode;
}

// The Root wrapper must not change layout, so it is display: contents.
const ROOT_STYLE: CSSProperties = { display: 'contents' };

/**
 * A Base UI tab strip (role=tablist, roving focus, arrow keys) that keeps the host's own
 * list class. Selection is controlled by `value`; each `TabBarTab` keeps its own onClick,
 * so clicking an already selected tab still runs the caller's handler.
 */
export const TabBar = ({ value, children, ...list }: TabBarProps) => (
    <Tabs.Root style={ROOT_STYLE} value={value}>
        <Tabs.List {...list}>{children}</Tabs.List>
    </Tabs.Root>
);

export const TabBarTab = Tabs.Tab;
