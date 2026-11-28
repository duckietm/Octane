import { FC, useState } from 'react';
import { HousekeepingTabId, LocalizeText, localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { WidgetErrorBoundary } from '../../common/error-boundary/WidgetErrorBoundary';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useHandheldLayout } from '../../hooks/handheld/useHandheldLayout';
import { HousekeepingDangerConfirmView } from './HousekeepingDangerConfirmView';
import type { HousekeepingPanelProps } from './HousekeepingPanel';
import { HousekeepingPasswordReveal } from './HousekeepingPasswordReveal';
import { HousekeepingStatusBanner } from './HousekeepingStatusBanner';
import { HousekeepingGlobalSearch } from './views/shell/HousekeepingGlobalSearch';
import { HousekeepingTabContent } from './views/shell/HousekeepingTabContent';

export const HandheldHousekeepingChevron: FC<{ back?: boolean }> = ({ back = false }) => (
    <svg aria-hidden="true" className="octane-handheld-hk__chevron" viewBox="0 0 16 16">
        <path d={back ? 'M10 3 L5 8 L10 13' : 'M6 3 L11 8 L6 13'} />
    </svg>
);

/** The round Back pill of a page of the phone panel. */
export const HandheldHousekeepingBack: FC<{ label?: string; onClick: () => void }> = ({ label, onClick }) => (
    <BaseButton className="octane-handheld-hk__back" type="button" onClick={onClick}>
        <HandheldHousekeepingChevron back />
        <span>{label ?? localizeWithFallback('generic.back', 'Back')}</span>
    </BaseButton>
);

/**
 * Housekeeping on a phone (HandheldHousekeeping.css), in the shared phone frame. The start page is the global search
 * over the sections the operator may open, as finger-sized rows with their icons and counts; a section opens as a
 * page with Back (upright), or beside the list (on its side). Every page is the desktop's own section view, so each
 * permission, packet and confirmation is the very same; the status, the password reveal and the typed danger
 * confirmation keep their place above the pages.
 */
export const HandheldHousekeepingView: FC<HousekeepingPanelProps> = ({ activeTab, navGroups, canManageSoundboard, onSelectTab, onClose }) => {
    const { orientation } = useHandheldLayout();
    const sideBySide = orientation === 'landscape';
    // The start list is on screen while the section it was left from is still the active one; a section opened from
    // inside a page (a list row opening a user, a dashboard card opening the rooms) shows that page again. The panel
    // opens on the list when it lands on the dashboard, and on the page a link asked for otherwise.
    const [listOver, setListOver] = useState<HousekeepingTabId | null>(() => (activeTab === HousekeepingTabId.DASHBOARD ? activeTab : null));
    const showList = sideBySide || listOver === activeTab;
    const showPage = sideBySide || !showList;
    const groups = navGroups.filter((group) => group.items.length > 0);
    const activeItem = groups.flatMap((group) => group.items).find((item) => item.id === activeTab);
    const title = LocalizeText('housekeeping.title');

    const openSection = (id: HousekeepingTabId) => {
        setListOver(null);
        onSelectTab(id);
    };

    return (
        <NativeTextTree>
            <WidgetErrorBoundary name="HousekeepingView">
                <DraggableWindow handheldSheet uniqueKey="housekeeping">
                    <HandheldSheetFrame className="octane-handheld-hk" icon="icon-housekeeping" title={title} onClose={onClose}>
                        <div className="octane-housekeeping octane-handheld-hk__root">
                            <div className="octane-handheld-hk__status">
                                <HousekeepingStatusBanner />
                                <HousekeepingPasswordReveal />
                            </div>
                            <div className="octane-handheld-hk__layout" data-page={showList ? 'list' : 'section'}>
                                {showList && (
                                    <nav aria-label={title} className="octane-handheld-hk__menu" data-testid="hk-handheld-menu">
                                        <div className="octane-handheld-hk__search">
                                            <HousekeepingGlobalSearch />
                                        </div>
                                        {groups.map((group) => (
                                            <div key={group.titleKey} className="octane-handheld-hk__group">
                                                <div className="octane-handheld-hk__heading">{LocalizeText(group.titleKey)}</div>
                                                <div className="octane-handheld-hk__rows">
                                                    {group.items.map((item) => (
                                                        <BaseButton
                                                            key={item.id}
                                                            aria-current={sideBySide && item.id === activeTab ? 'page' : undefined}
                                                            className="octane-handheld-hk__row"
                                                            data-active={sideBySide && item.id === activeTab}
                                                            data-testid={`hk-handheld-section-${item.id}`}
                                                            type="button"
                                                            onClick={() => openSection(item.id)}
                                                        >
                                                            <span className="octane-handheld-hk__row-icon">
                                                                <span className={`octane-icon octane-icon-hk-tab ${item.icon}`} />
                                                            </span>
                                                            <span className="octane-handheld-hk__row-label">{LocalizeText(item.labelKey)}</span>
                                                            {!!item.count && <span className="octane-handheld-hk__count">{item.count}</span>}
                                                            <HandheldHousekeepingChevron />
                                                        </BaseButton>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </nav>
                                )}
                                {showPage && (
                                    <section className="octane-handheld-hk__page" data-section={activeTab} data-testid="hk-handheld-page">
                                        <div className="octane-handheld-hk__page-head">
                                            {!sideBySide && <HandheldHousekeepingBack onClick={() => setListOver(activeTab)} />}
                                            <span className="octane-handheld-hk__page-title">
                                                {activeItem ? LocalizeText(activeItem.labelKey) : LocalizeText('housekeeping.tab.dashboard')}
                                            </span>
                                        </div>
                                        <div className="octane-handheld-hk__content">
                                            <HousekeepingTabContent activeTab={activeTab} canManageSoundboard={canManageSoundboard} />
                                        </div>
                                    </section>
                                )}
                            </div>
                            <HousekeepingDangerConfirmView />
                        </div>
                    </HandheldSheetFrame>
                </DraggableWindow>
            </WidgetErrorBoundary>
        </NativeTextTree>
    );
};
