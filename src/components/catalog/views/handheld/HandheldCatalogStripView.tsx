import { FC, ReactNode } from 'react';
import { localizeWithFallback } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useHandheldCatalogPage } from '../../../../hooks/catalog/handheldCatalogPageContext';

export interface HandheldCatalogStripViewProps {
    /** What the strip names: the chosen item, or the open page when left out. */
    title?: string | null;
    /** Something at the end of the strip (the button that folds the preview). */
    children?: ReactNode;
}

/**
 * Phone catalogue: the strip at the head of the bottom panel of a page. Upright its back button returns to the list
 * of pages (the stylesheet takes it away on a phone on its side, where that list sits beside the page); the title
 * names the chosen item, or the page while nothing is chosen.
 */
export const HandheldCatalogStripView: FC<HandheldCatalogStripViewProps> = ({ title = null, children = null }) => {
    const page = useHandheldCatalogPage();

    if (!page) return null;

    return (
        <NativeTextTree>
            <div className="octane-handheld-shop__strip">
                <BaseButton
                    aria-label={localizeWithFallback('octane.handheld.catalog.back', 'Back to %name%', ['name'], [page.backLabel])}
                    className="octane-handheld-shop__back"
                    onClick={page.onBack}
                >
                    <svg aria-hidden="true" viewBox="0 0 16 16">
                        <path d="M10 3 L5 8 L10 13" />
                    </svg>
                    <span className="octane-handheld-shop__back-label">{localizeWithFallback('generic.back', 'Back')}</span>
                </BaseButton>
                <h2 className="octane-handheld-shop__strip-title">{title || page.pageTitle}</h2>
                {children}
            </div>
        </NativeTextTree>
    );
};
