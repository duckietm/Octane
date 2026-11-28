import { FC } from 'react';
import { HousekeepingTabId, LocalizeText } from '../../api';
import { DraggableWindowPosition, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, WidgetErrorBoundary } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { HousekeepingDangerConfirmView } from './HousekeepingDangerConfirmView';
import { HousekeepingPasswordReveal } from './HousekeepingPasswordReveal';
import { HousekeepingStatusBanner } from './HousekeepingStatusBanner';
import { HousekeepingNavGroup, HousekeepingSidebar } from './views/shell/HousekeepingSidebar';
import { HousekeepingTabContent } from './views/shell/HousekeepingTabContent';
import { HandheldHousekeepingView } from './HandheldHousekeepingView';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';
import { HANDHELD_TOUCH_FRAME_SCALE } from '../../api/handheld/handheldWindowFit';

export interface HousekeepingPanelProps {
    activeTab: HousekeepingTabId;
    navGroups: HousekeepingNavGroup[];
    canManageSoundboard: boolean;
    onSelectTab: (tab: HousekeepingTabId) => void;
    onClose: () => void;
}

/**
 * The open Housekeeping window: sidebar, banners and the tabs. Loaded only when an operator opens
 * the panel (see HousekeepingView), so players never download the staff tools.
 */
export const HousekeepingPanel: FC<HousekeepingPanelProps> = ({ activeTab, navGroups, canManageSoundboard, onSelectTab, onClose }) => {
    const isHandheld = useIsHandheld();

    // On a phone the same sections, banners and confirmation sit in the phone sheet instead of the window.
    if (isHandheld) {
        return (
            <HandheldHousekeepingView
                activeTab={activeTab}
                canManageSoundboard={canManageSoundboard}
                navGroups={navGroups}
                onClose={onClose}
                onSelectTab={onSelectTab}
            />
        );
    }

    return (
        <NativeTextTree>
            <WidgetErrorBoundary name="HousekeepingView">
                <OctaneCardView handheldScale={HANDHELD_TOUCH_FRAME_SCALE}
                    className={`octane-housekeeping w-[860px] h-[620px] max-h-[92vh] max-w-[96vw]`}
                    theme="primary-slim"
                    uniqueKey="housekeeping"
                    windowPosition={DraggableWindowPosition.TOP_CENTER}
                >
                    <OctaneCardHeaderView headerText={LocalizeText('housekeeping.title')} onCloseClick={() => onClose()} />
                    <div className="relative flex min-h-0 grow text-black">
                        <HousekeepingSidebar active={activeTab} groups={navGroups} onSelect={onSelectTab} />
                        <div className="flex min-w-0 grow flex-col">
                            <HousekeepingStatusBanner />
                            <HousekeepingPasswordReveal />
                            <OctaneCardContentView className="min-h-0 grow text-black" gap={2}>
                                <HousekeepingTabContent activeTab={activeTab} canManageSoundboard={canManageSoundboard} />
                            </OctaneCardContentView>
                        </div>
                        <HousekeepingDangerConfirmView />
                    </div>
                </OctaneCardView>
            </WidgetErrorBoundary>
        </NativeTextTree>
    );
};
