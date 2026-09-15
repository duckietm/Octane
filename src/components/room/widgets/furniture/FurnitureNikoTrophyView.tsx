import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';

/** `TrophyFurniWidget.VIEW_NIKO_SILVER` / `VIEW_NIKO_GOLD`: the `furniture_extras` values that pick this view. */
export const TROPHY_VIEW_NIKO_SILVER = 10;
export const TROPHY_VIEW_NIKO_GOLD = 20;

export const isNikoTrophyView = (viewType: number): boolean => viewType === TROPHY_VIEW_NIKO_SILVER || viewType === TROPHY_VIEW_NIKO_GOLD;

interface FurnitureNikoTrophyViewProps {
    viewType: number;
    date: string;
    onClose: () => void;
}

/**
 * `niko_trophy` (428x325, NikoTrophyView.as): the silver or gold trophy image from the image
 * library, the matching description, the unlock date, and the App Store link and banner.
 */
export const FurnitureNikoTrophyView: FC<FurnitureNikoTrophyViewProps> = (props) => {
    const { viewType = TROPHY_VIEW_NIKO_SILVER, date = '', onClose = null } = props;
    const gold = viewType === TROPHY_VIEW_NIKO_GOLD;
    const imageLibrary = GetConfigurationValue<string>('image.library.url', '');
    const trophyImage = `${imageLibrary}niko/niko_trophy_${gold ? 'gold' : 'silver'}.png`;
    const storeImageName = GetConfigurationValue<string>('niko.trophy.appstore.image', 'niko_appstore_button');
    const storeUrl = GetConfigurationValue<string>('niko.trophy.appstore.url', '');

    const openStore = () => {
        if (storeUrl && storeUrl.length) window.open(storeUrl, 'habboMain');
    };

    return (
        <OctaneCardView className="octane-niko-trophy" theme="primary-slim" uniqueKey="niko-trophy">
            <OctaneCardHeaderView headerText={localizeWithFallback('niko.trophy.title', 'Niko Trophy')} onCloseClick={onClose} />
            <OctaneCardContentView gap={2}>
                <div className="octane-niko-trophy-top">
                    <img alt="" className="octane-niko-trophy-image" src={trophyImage} />
                    <div className="octane-niko-trophy-text">
                        <div data-testid="niko-trophy-description">
                            {gold
                                ? localizeWithFallback(
                                      'niko.trophy.description.gold',
                                      "Golden Niko Trophy is awarded only when you rescue all Niko's friends and complete the whole Niko game."
                                  )
                                : localizeWithFallback(
                                      'niko.trophy.description.silver',
                                      'Niko Trophy is awarded only when you pay and unlock the full Niko game in the iTunes App Store.'
                                  )}
                        </div>
                        <button className="octane-niko-trophy-link" type="button" onClick={openStore}>
                            {localizeWithFallback('niko.trophy.link.text', 'Try Niko for free!')}
                        </button>
                        <div className="octane-niko-trophy-date" data-testid="niko-trophy-date">
                            {localizeWithFallback('trophy.niko.date', 'Trophy unlocked on %date%', ['date'], [date])}
                        </div>
                    </div>
                </div>
                <div className="octane-niko-trophy-store">
                    <img
                        alt=""
                        className="octane-niko-trophy-store-image"
                        src={`${imageLibrary}niko/${storeImageName}.png`}
                        title={localizeWithFallback('trophy.niko.link.tooltip', 'Download from App Store')}
                        onClick={openStore}
                    />
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
