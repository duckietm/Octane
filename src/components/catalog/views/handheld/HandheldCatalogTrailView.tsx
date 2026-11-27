import { FC } from 'react';
import { FaChevronLeft } from 'react-icons/fa';
import { localizeWithFallback } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

export interface HandheldCatalogTrailViewProps {
    /** What is on screen now (a folder or a page). */
    title: string;
    /** Where back goes; without it the bar shows only the title (the top of the tree). */
    backLabel?: string | null;
    onBack?: () => void;
}

/** Phone catalogue: one bar above the list or page, with a large back button to go up a level. */
export const HandheldCatalogTrailView: FC<HandheldCatalogTrailViewProps> = ({ title, backLabel = null, onBack }) => {
    const canGoBack = !!onBack && backLabel !== null;

    return (
        <NativeTextTree>
            <div className="octane-handheld-catalog__trail">
                {canGoBack && (
                    <BaseButton
                        aria-label={localizeWithFallback('octane.handheld.catalog.back', 'Back to %name%', ['name'], [backLabel])}
                        className="octane-handheld-catalog__back"
                        onClick={onBack}
                    >
                        <FaChevronLeft aria-hidden="true" />
                        <span className="octane-handheld-catalog__back-label">{backLabel}</span>
                    </BaseButton>
                )}
                <h2 className="octane-handheld-catalog__title">{title}</h2>
            </div>
        </NativeTextTree>
    );
};
