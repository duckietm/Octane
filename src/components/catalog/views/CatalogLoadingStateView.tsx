import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { LayoutLoadingSpinnerView } from '../../../common';

interface CatalogLoadingStateViewProps {
    error?: 'timeout' | null;
    onRetry?: () => void;
}

const localizedOrFallback = (key: string, fallback: string) => {
    const localized = LocalizeText(key);

    return !localized || localized === key ? fallback : localized;
};

export const CatalogLoadingStateView: FC<CatalogLoadingStateViewProps> = ({ error = null, onRetry = null }) => {
    if (error) {
        return (
            <div aria-live="assertive" className="octane-catalog-loading-state is-error" role="alert">
                <span>{localizedOrFallback('catalog.loading.timeout', 'The catalog page took too long to load.')}</span>
                {!!onRetry && (
                    <button className="octane-catalog-standard-button" type="button" onClick={onRetry}>
                        {localizedOrFallback('generic.retry', 'Retry')}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div aria-live="polite" className="octane-catalog-loading-state" role="status">
            <LayoutLoadingSpinnerView />
            <span>{LocalizeText('generic.loading') || 'Loading...'}</span>
        </div>
    );
};
