import { FC, useEffect } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../api';
import { OctaneCardHeaderView, OctaneCardView } from '../../common';
import { ToggleButton } from '../../common/ToggleButton';
import { collectorLevelColor, TAB_CAPTIONS, toHexColor, visibleCollectiblesTabs } from '../../hooks/collectibles/collectibles.helpers';
import { useCollectibles } from '../../hooks/collectibles/useCollectibles';
import emeraldIcon from '../../assets/images/collectibles/pursearea_mid_emerald_icon.png';
import silverIcon from '../../assets/images/collectibles/pursearea_mid_silver_icon.png';
import { CollectiblesCollectionsTabView } from './CollectiblesCollectionsTabView';
import { CollectiblesInfoTabView } from './CollectiblesInfoTabView';
import { CollectiblesMintTabView } from './CollectiblesMintTabView';
import { CollectiblesRewardsTabView } from './CollectiblesRewardsTabView';
import { CollectiblesShopTabView } from './CollectiblesShopTabView';
import { CollectiblesTransferTabView } from './CollectiblesTransferTabView';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/**
 * The official collectibles hub (`collectible_view_xml`, 500x600): the collector header with XP, high
 * score, level and the silver and emerald balances, the tab bar, and one container per tab.
 */
export const CollectiblesHubView: FC = () => {
    const { isVisible = false, currentTab = 'rewards', setCurrentTab = null, closeHub = null, score, emeralds = 0, silver = 0 } = useCollectibles();
    const tabs = visibleCollectiblesTabs((key) => GetConfigurationValue<boolean>(key, false) === true);

    useEffect(() => {
        if (isVisible && !tabs.includes(currentTab)) setCurrentTab?.(tabs[0]);
    }, [isVisible, tabs, currentTab, setCurrentTab]);

    if (!isVisible) return null;

    const levelColor = toHexColor(collectorLevelColor(score?.level ?? 0));

    return (
        <NativeTextTree>
            <OctaneCardView classNames={['octane-collectibles-hub']} frameStyle={3} isResizable={false} uniqueKey="collectibles-hub">
                <OctaneCardHeaderView headerText={localizeWithFallback('collectibles.title', 'Collectibles')} onCloseClick={() => closeHub?.()} />
                <div className="octane-collectibles-hub-content" data-testid="collectibles-hub">
                    <div className="octane-collectibles-header">
                        <div className="octane-collectibles-header-gradient" />
                        <div className="octane-collectibles-header-bg-left" />
                        <div className="octane-collectibles-header-bg-right" />
                        <div className="octane-collectibles-level-strip" style={{ backgroundColor: levelColor }} />
                        <div className="octane-collectibles-level-element" style={{ backgroundColor: levelColor }} />
                        <div className="octane-collectibles-cabinet" />
                        <div className="octane-collectibles-score">
                            <span className="octane-collectibles-score-key">{localizeWithFallback('collectibles.score', 'Collector XP:')}</span>
                            <span className="octane-collectibles-score-value" data-testid="collectibles-score">
                                {score?.score ?? 0}
                            </span>
                            <span className="octane-collectibles-score-key">{localizeWithFallback('collectibles.high_score', 'All time highest XP:')}</span>
                            <span className="octane-collectibles-score-value">{score?.highestScore ?? 0}</span>
                        </div>
                        <div className="octane-collectibles-level">
                            <span className="octane-collectibles-level-value" data-testid="collectibles-level">
                                {score?.level ?? 0}
                            </span>
                            <span className="octane-collectibles-level-title">{localizeWithFallback('collectibles.level', 'Level').toUpperCase()}</span>
                        </div>
                        <div className="octane-collectibles-currency is-silver">
                            <span data-testid="collectibles-silver">{silver}</span>
                            <img alt="" draggable={false} src={silverIcon} />
                        </div>
                        <div className="octane-collectibles-currency is-emerald">
                            <span data-testid="collectibles-emeralds">{emeralds}</span>
                            <img alt="" draggable={false} src={emeraldIcon} />
                        </div>
                    </div>
                    <div className="octane-collectibles-tabs" role="tablist">
                        {tabs.map((tab) => (
                            <ToggleButton
                                key={tab}
                                className={`octane-collectibles-tab${currentTab === tab ? ' is-active' : ''}`}
                                pressed={currentTab === tab}
                                onClick={() => setCurrentTab?.(tab)}
                            >
                                {localizeWithFallback(TAB_CAPTIONS[tab][0], TAB_CAPTIONS[tab][1])}
                            </ToggleButton>
                        ))}
                    </div>
                    <div className="octane-collectibles-tab-content">
                        {currentTab === 'rewards' && <CollectiblesRewardsTabView />}
                        {currentTab === 'collections' && <CollectiblesCollectionsTabView />}
                        {currentTab === 'shop' && <CollectiblesShopTabView />}
                        {currentTab === 'minting' && <CollectiblesMintTabView />}
                        {currentTab === 'transfer' && <CollectiblesTransferTabView />}
                        {currentTab === 'info' && <CollectiblesInfoTabView />}
                    </div>
                </div>
            </OctaneCardView>
        </NativeTextTree>
    );
};
