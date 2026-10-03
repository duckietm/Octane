import { FC, ReactNode } from 'react';
import { HousekeepingTabId, LocalizeText } from '../../../../api';
import { HousekeepingGlobalSearch } from './HousekeepingGlobalSearch';

export interface HousekeepingNavItem {
    id: HousekeepingTabId;
    icon: string;
    labelKey: string;
    /** Number shown on the right, e.g. users selected for a bulk action. */
    count?: number;
}

export interface HousekeepingNavGroup {
    titleKey: string;
    items: HousekeepingNavItem[];
}

/**
 * The hotel icons are pixel art in their own sizes (13x23 up to 44x38). Any
 * scaling blurs them, so each one keeps its size, centred in a slot as wide as
 * the widest: the labels start at the same x and every row has the same height.
 */
const HousekeepingNavIcon: FC<{ icon: string }> = ({ icon }) => (
    <span className="flex h-[38px] w-[44px] shrink-0 items-center justify-center">
        <span className={`octane-icon octane-icon-hk-tab ${icon} shrink-0`} />
    </span>
);

/** Left column of the panel: the global search over grouped sections. */
export const HousekeepingSidebar: FC<{
    groups: HousekeepingNavGroup[];
    active: HousekeepingTabId;
    onSelect: (id: HousekeepingTabId) => void;
    footer?: ReactNode;
}> = ({ groups, active, onSelect, footer }) => (
    <nav aria-label={LocalizeText('housekeeping.title')} className="flex w-[172px] shrink-0 flex-col gap-2 border-r border-zinc-300 bg-zinc-100/80 p-2">
        <HousekeepingGlobalSearch />
        <div className="flex grow flex-col gap-2 overflow-y-auto">
            {groups
                .filter((group) => group.items.length > 0)
                .map((group) => (
                    <div key={group.titleKey} className="flex flex-col gap-0.5">
                        <div className="px-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500">{LocalizeText(group.titleKey)}</div>
                        {group.items.map((item) => {
                            const isActive = item.id === active;

                            return (
                                <button
                                    key={item.id}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-left text-xs transition-colors ${
                                        isActive ? 'bg-white font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-300' : 'text-zinc-700 hover:bg-white/70'
                                    }`}
                                    type="button"
                                    onClick={() => onSelect(item.id)}
                                >
                                    <HousekeepingNavIcon icon={item.icon} />
                                    <span className="grow truncate">{LocalizeText(item.labelKey)}</span>
                                    {!!item.count && (
                                        <span className="rounded-full bg-sky-600 px-1.5 text-[9px] font-bold tabular-nums text-white">{item.count}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
        </div>
        {footer}
    </nav>
);
