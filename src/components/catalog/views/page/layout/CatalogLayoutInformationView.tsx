import { FC, useEffect } from 'react';
import { LocalizeText, localizeWithFallback, OpenUrl, SanitizeHtml } from '../../../../../api';
import { useNotification } from '../../../../../hooks';
import { CatalogLayoutProps } from './CatalogLayout.types';
import { getCatalogInformationImageLink, ICatalogInformationLink } from './catalogInformationLinks.helpers';

export const CatalogLayoutInformationView: FC<CatalogLayoutProps> = ({ page, hideNavigation }) => {
    const { simpleAlert = null } = useNotification();
    const images = Array.from({ length: 4 }, (_, index) => ({ index, url: page.localization.getImage(index) })).filter((image) => !!image.url);
    const texts = Array.from({ length: 8 }, (_, index) => page.localization.getText(index)).filter(Boolean);

    useEffect(() => {
        hideNavigation?.();
    }, [hideNavigation]);

    // LocalizationCatalogWidget.openExternalLink: the "link opens a web page" alert plus the store link.
    const openExternalLink = (link: ICatalogInformationLink) => {
        const url = localizeWithFallback(link.localizationKey, link.fallbackUrl);

        if (!url) return;

        simpleAlert?.(LocalizeText('catalog.alert.external.link.desc'), null, null, null, LocalizeText('catalog.alert.external.link.title'));
        OpenUrl(url);
    };

    if (!images.length && !texts.length) {
        return (
            <div className="octane-catalog-specialized-state" role="status">
                {localizeWithFallback('catalog.layout.info.empty', 'Information will be available here soon.')}
            </div>
        );
    }

    return (
        <article className="octane-catalog-information-layout">
            {!!images.length && (
                <div className="octane-catalog-information-images">
                    {images.map((image) => {
                        const link = getCatalogInformationImageLink(page.layoutCode, image.index);

                        if (!link) return <img key={`${image.url}-${image.index}`} alt="" src={image.url} />;

                        return (
                            <button
                                key={`${image.url}-${image.index}`}
                                className="octane-catalog-information-link"
                                data-testid={`catalog-information-link-${image.index}`}
                                type="button"
                                onClick={() => openExternalLink(link)}
                            >
                                <img alt="" src={image.url} />
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="octane-catalog-information-copy">
                {texts.map((text, index) => (
                    <section key={index} dangerouslySetInnerHTML={{ __html: SanitizeHtml(text) }} />
                ))}
            </div>
        </article>
    );
};
