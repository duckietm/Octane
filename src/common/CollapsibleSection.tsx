import { Collapsible } from '@base-ui/react/collapsible';
import { FC, ReactNode } from 'react';

export interface CollapsibleSectionProps {
    /** The always-visible heading (what a native `<summary>` held). */
    title: ReactNode;
    children?: ReactNode;
    defaultOpen?: boolean;
    /** Classes for the root, e.g. a column layout for the panel. */
    className?: string;
    /** Extra classes for the heading button. */
    triggerClassName?: string;
}

/**
 * Base UI replacement for `<details><summary>`. The panel stays mounted while
 * closed (hidden), like a native details element keeps its content, so form
 * state and refs inside it survive. The disclosure marker is drawn by css.
 */
export const CollapsibleSection: FC<CollapsibleSectionProps> = (props) => {
    const { title, children = null, defaultOpen = false, className, triggerClassName } = props;

    return (
        <Collapsible.Root className={className} defaultOpen={defaultOpen}>
            <Collapsible.Trigger className={triggerClassName ? `octane-collapsible-trigger ${triggerClassName}` : 'octane-collapsible-trigger'}>{title}</Collapsible.Trigger>
            <Collapsible.Panel keepMounted className="octane-collapsible-panel">
                {children}
            </Collapsible.Panel>
        </Collapsible.Root>
    );
};
