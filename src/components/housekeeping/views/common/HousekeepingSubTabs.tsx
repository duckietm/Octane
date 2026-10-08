import { ReactNode } from 'react';

export interface HousekeepingSubTab<T extends string> {
    id: T;
    label: string;
    icon?: ReactNode;
    /** Small counter shown next to the label, e.g. the entries in the history. */
    count?: number;
}

/**
 * The sub-pages of the user and room pages, and the choices inside a page
 * (compact), as a segmented control styled in HousekeepingView.css.
 */
export const HousekeepingSubTabs = <T extends string>({
    tabs,
    active,
    onChange,
    compact = false
}: {
    tabs: HousekeepingSubTab<T>[];
    active: T;
    onChange: (id: T) => void;
    compact?: boolean;
}) => (
    <div className={`hk-segmented${compact ? ' hk-segmented--compact' : ''}`} role="tablist">
        {tabs.map((tab) => {
            const isActive = tab.id === active;

            return (
                <button
                    key={tab.id}
                    aria-selected={isActive}
                    className={`hk-segmented__item${isActive ? ' is-active' : ''}`}
                    role="tab"
                    title={tab.label}
                    type="button"
                    onClick={() => onChange(tab.id)}
                >
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && <span className="hk-segmented__count">{tab.count}</span>}
                </button>
            );
        })}
    </div>
);
