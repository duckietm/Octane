import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { flashFontTagsToSpans, GetConfigurationValue, localizeWithFallback, SanitizeHtml } from '../../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/** English fallbacks for the AIR texts, used only when the external texts lack the key. */
const FALLBACKS: Record<string, string> = {
    'vip.benefits.caption': 'HC Benefits',
    'vip.benefits.title': 'Be in the spotlight!',
    'vip.benefits.description':
        '<b><font size="24">Create</font></b><br/>your own Groups and stunning rooms<br/><br/><b><font size="24">Show off</font></b><br/>your own style with exclusive clothes and the coolest hairstyles.',
    'vip.benefits.details':
        '<b>What you get:</b> HC Badge, multi-coloured clothes, extra hairstyles, extended room layouts, exclusive gifts, a bigger friends list and more!'
};

const text = (key: string): string => localizeWithFallback(key, FALLBACKS[key] ?? key);

const html = (key: string): { __html: string } => ({ __html: SanitizeHtml(flashFontTagsToSpans(text(key))) });

/**
 * AIR vip_benefits (habbo-catalog-com, catalog/club/VipBenefitsWindow): the 457x450 "HC benefits" window
 * CatalogUtils.showVipBenefits opens from the VIP buy page link and the VIP required window. The header and
 * teaser images come from the image library, as in AIR (`${image.library.url}directVipBuy/...`).
 */
export const VipBenefitsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((value) => !value);
                        return;
                }
            },
            eventUrlPrefix: 'vip-benefits/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if (!isVisible) return null;

    const imageLibrary = GetConfigurationValue<string>('image.library.url', '');

    return (
        <NativeTextTree>
            <OctaneCardView classNames={['octane-vip-benefits']} frameStyle={3} isResizable={false} theme="primary-slim" uniqueKey="vip-benefits">
                <OctaneCardHeaderView headerText={text('vip.benefits.caption')} onCloseClick={() => setIsVisible(false)} />
                <OctaneCardContentView classNames={['octane-vip-benefits-content']} overflow="hidden">
                    <img alt="" className="octane-vip-benefits-header" src={`${imageLibrary}directVipBuy/hc_benefits_header.png`} />
                    <img alt="" className="octane-vip-benefits-teaser" src={`${imageLibrary}directVipBuy/hc_benefits_teaser.png`} />
                    <span className="octane-vip-benefits-title" data-testid="vip-benefits-title">
                        {text('vip.benefits.title')}
                    </span>
                    <div
                        className="octane-vip-benefits-description"
                        dangerouslySetInnerHTML={html('vip.benefits.description')}
                        data-testid="vip-benefits-description"
                    />
                    <div className="octane-vip-benefits-details" dangerouslySetInnerHTML={html('vip.benefits.details')} />
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
