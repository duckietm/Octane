import { FC, useEffect, useRef } from 'react';
import { localizeWithFallback, SanitizeHtml } from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutInformationView: FC<CatalogLayoutProps> = ({ page, hideNavigation }) => {
    const images = Array.from({ length: 4 }, (_, index) => page.localization.getImage(index)).filter(Boolean);
    const texts = Array.from({ length: 8 }, (_, index) => page.localization.getText(index)).filter(Boolean);

    // Only when this page opens; see CatalogLayoutFrontpage4View.
    const hideNavigationRef = useRef(hideNavigation);

    hideNavigationRef.current = hideNavigation;

    useEffect(() => {
        hideNavigationRef.current?.();
    }, [page]);

    if (!images.length && !texts.length) {
        return (
            <NativeTextTree>
                <div className="octane-catalog-specialized-state" role="status">
                    {localizeWithFallback('catalog.layout.info.empty', 'Information will be available here soon.')}
                </div>
            </NativeTextTree>
        );
    }

    return (
        <article className="octane-catalog-information-layout">
            {!!images.length && (
                <div className="octane-catalog-information-images">
                    {images.map((image, index) => <img key={`${image}-${index}`} alt="" src={image} />)}
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
