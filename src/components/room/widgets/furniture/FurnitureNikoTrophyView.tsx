import { FC } from 'react';
import { GetConfigurationValue, OpenUrl, SanitizeHtml, localizeWithFallback } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { TROPHY_VIEW_NIKO_GOLD } from '../../../../hooks';

interface FurnitureNikoTrophyViewProps {
    view: number;
    date: string;
    onClose: () => void;
}

/**
 * Official `NikoTrophyView` (`niko_trophy` layout, 428 x 325): the dark top band with the gold or
 * silver trophy picture, the description, the "try Niko" link and the date won, then the app store
 * banner. Pictures come from the image library (`niko/niko_trophy_gold|silver.png`, and the banner
 * named by `niko.trophy.appstore.image`); the link and the banner open `niko.appstore.link.url`.
 */
export const FurnitureNikoTrophyView: FC<FurnitureNikoTrophyViewProps> = (props) => {
    const { view, date, onClose } = props;
    const isGold = view === TROPHY_VIEW_NIKO_GOLD;
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const storeImage = GetConfigurationValue<string>('niko.trophy.appstore.image', '');
    const storeUrl = GetConfigurationValue<string>('niko.appstore.link.url', '');

    const description = isGold
        ? localizeWithFallback('niko.trophy.description.gold', '<b>Golden Niko Trophy</b> is only earned by freeing all of Niko\'s friends and finishing the whole game.')
        : localizeWithFallback('niko.trophy.description.silver', '<b>Niko Trophy</b> is only earned by buying the whole Niko game.');
    const dateText = localizeWithFallback('trophy.niko.date', `Trophy won on <b>${date}</b>`, ['date'], [date]);

    const openStore = () => {
        if (storeUrl) OpenUrl(storeUrl);
    };

    return (
        <OctaneCardView className="octane-niko-trophy" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('niko.trophy.title', 'Niko Trophy')} onCloseClick={onClose} />
            <OctaneCardContentView className="octane-niko-trophy-content" gap={0}>
                <div className="octane-niko-trophy-band">
                    <img alt="" className="octane-niko-trophy-preview" src={`${imageLibraryUrl}niko/${isGold ? 'niko_trophy_gold' : 'niko_trophy_silver'}.png`} />
                    <div className="octane-niko-trophy-texts">
                        <div className="octane-niko-trophy-description" dangerouslySetInnerHTML={{ __html: SanitizeHtml(description) }} />
                        <BaseButton className="octane-niko-trophy-link" onClick={openStore}>
                            {localizeWithFallback('niko.trophy.link.text', 'Try Niko for free!')}
                        </BaseButton>
                        <div className="octane-niko-trophy-date" dangerouslySetInnerHTML={{ __html: SanitizeHtml(dateText) }} />
                    </div>
                </div>
                {storeImage && (
                    <BaseButton
                        aria-label={localizeWithFallback('trophy.niko.link.tooltip', 'Download from the App Store')}
                        className="octane-niko-trophy-store"
                        onClick={openStore}
                    >
                        <img alt="" src={`${imageLibraryUrl}niko/${storeImage}.png`} />
                    </BaseButton>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
