import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { LayoutLoadingSpinnerView } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

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
            <NativeTextTree>
                <div aria-live="assertive" className="octane-catalog-loading-state is-error" role="alert">
                    <span>{localizedOrFallback('catalog.loading.timeout', 'The catalog page took too long to load.')}</span>
                    {!!onRetry && (
                        <BaseButton className="octane-catalog-standard-button" type="button" onClick={onRetry}>
                            {localizedOrFallback('generic.retry', 'Retry')}
                        </BaseButton>
                    )}
                </div>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div aria-live="polite" className="octane-catalog-loading-state" role="status">
                <LayoutLoadingSpinnerView />
                <span>{LocalizeText('generic.loading') || 'Loading...'}</span>
            </div>
        </NativeTextTree>
    );
};
