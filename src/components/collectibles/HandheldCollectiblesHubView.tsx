import { CSSProperties, FC, ReactNode } from 'react';
import { localizeWithFallback } from '../../api';
import emeraldIcon from '../../assets/images/collectibles/pursearea_mid_emerald_icon.png';
import silverIcon from '../../assets/images/collectibles/pursearea_mid_silver_icon.png';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { CollectiblesTab, TAB_CAPTIONS } from '../../hooks/collectibles/collectibles.helpers';

export interface HandheldCollectiblesHubViewProps {
    tabs: CollectiblesTab[];
    currentTab: CollectiblesTab;
    onTab: (tab: CollectiblesTab) => void;
    onClose: () => void;
    level: number;
    levelColor: string;
    silver: number;
    emeralds: number;
    /** Rewards waiting to be claimed, counted on the Rewards tab. */
    claimable: number;
    children: ReactNode;
}

/**
 * The collectibles hub on a phone (HandheldCollectibles.css): a full-screen sheet in the shared frame with the
 * collector level and both balances in the header and the hub's tabs as pills. `CollectiblesHubView` keeps the
 * state; every tab view hands its own data and handlers to its phone twin, which is what this frame holds.
 */
export const HandheldCollectiblesHubView: FC<HandheldCollectiblesHubViewProps> = (props) => {
    const { tabs, currentTab, onTab, onClose, level, levelColor, silver, emeralds, claimable, children } = props;
    const levelLabel = localizeWithFallback('collectibles.level', 'Level');

    const headerExtra = (
        <span className="octane-handheld-collectibles__purse">
            <span
                aria-label={`${levelLabel} ${level}`}
                className="octane-handheld-collectibles__level"
                data-testid="collectibles-level"
                role="img"
                style={{ '--hh-level': levelColor } as CSSProperties}
            >
                {level}
            </span>
            <span
                aria-label={`${silver} ${localizeWithFallback('octane.handheld.collectibles.silver', 'Silver')}`}
                className="octane-handheld-collectibles__coin"
                data-testid="collectibles-silver"
            >
                <span>{silver}</span>
                <img alt="" draggable={false} src={silverIcon} />
            </span>
            <span
                aria-label={`${emeralds} ${localizeWithFallback('octane.handheld.collectibles.emeralds', 'Emeralds')}`}
                className="octane-handheld-collectibles__coin"
                data-testid="collectibles-emeralds"
            >
                <span>{emeralds}</span>
                <img alt="" draggable={false} src={emeraldIcon} />
            </span>
        </span>
    );

    return (
        <NativeTextTree>
            <DraggableWindow handheldSheet uniqueKey="collectibles-hub">
                <HandheldSheetFrame
                    activeTab={currentTab}
                    className="octane-handheld-collectibles"
                    headerExtra={headerExtra}
                    icon="icon-me-collectibles"
                    tabs={tabs.map((tab) => ({
                        id: tab,
                        label: localizeWithFallback(TAB_CAPTIONS[tab][0], TAB_CAPTIONS[tab][1]),
                        count: tab === 'rewards' ? claimable : undefined
                    }))}
                    tabsLabel={localizeWithFallback('octane.handheld.collectibles.tabs', 'Collectibles sections')}
                    title={localizeWithFallback('collectibles.title', 'Collectibles')}
                    onClose={onClose}
                    onTab={(id) => onTab(id as CollectiblesTab)}
                >
                    <div className="octane-handheld-collectibles__content" data-tab={currentTab} data-testid="collectibles-hub">
                        {children}
                    </div>
                </HandheldSheetFrame>
            </DraggableWindow>
        </NativeTextTree>
    );
};
