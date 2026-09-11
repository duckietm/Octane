import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, OpenUrl, SanitizeHtml } from '../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';

export const VIP_BENEFITS_LINK = 'habboUI/open/vipbenefits';

/**
 * vip_benefits.xml (457x450, VipBenefitsWindow.as): the standalone "HC Benefits" window opened by
 * HabboCatalogUtils.showVipBenefits (`habboUI/open/vipbenefits` here). When
 * `catalog.vip.benefits.enabled` is off the official client opens `link.format.club` instead.
 */
export const VipBenefitsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 3 || parts[1] !== 'open' || parts[2] !== 'vipbenefits') return;

                if (GetConfigurationValue<boolean>('catalog.vip.benefits.enabled', true) === false) {
                    const clubUrl = localizeWithFallback('link.format.club', '');

                    if (clubUrl) OpenUrl(clubUrl);

                    return;
                }

                setIsVisible(true);
            },
            eventUrlPrefix: 'habboUI/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if (!isVisible) return null;

    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    return (
        <OctaneCardView classNames={['octane-vip-benefits-window']} isResizable={false} theme="primary-slim" uniqueKey="vip-benefits">
            <OctaneCardHeaderView headerText={localizeWithFallback('vip.benefits.caption', 'HC Benefits')} onCloseClick={() => setIsVisible(false)} />
            <OctaneCardContentView classNames={['octane-vip-benefits-content']} overflow="hidden">
                <img alt="" className="octane-vip-benefits-header" src={`${imageLibraryUrl}directVipBuy/hc_benefits_header.png`} />
                <h2 className="octane-vip-benefits-title">{localizeWithFallback('vip.benefits.title', 'Stand Out From The Crowd')}</h2>
                <img alt="" className="octane-vip-benefits-teaser" src={`${imageLibraryUrl}directVipBuy/hc_benefits_teaser.png`} />
                <div
                    className="octane-vip-benefits-description"
                    dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('vip.benefits.description')) }}
                    data-testid="vip-benefits-description"
                />
                <div
                    className="octane-vip-benefits-details"
                    dangerouslySetInnerHTML={{ __html: SanitizeHtml(LocalizeText('vip.benefits.details')) }}
                    data-testid="vip-benefits-details"
                />
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
