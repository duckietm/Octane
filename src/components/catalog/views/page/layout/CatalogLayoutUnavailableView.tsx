import { FC } from 'react';
import { localizeWithFallback } from '../../../../../api';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { CatalogLayoutProps } from './CatalogLayout.types';

export const CatalogLayoutUnavailableView: FC<CatalogLayoutProps> = () => (
    <NativeTextTree>
        <div className="flex h-full items-center justify-center p-6 text-center" role="status">
            <div className="flex max-w-[280px] flex-col items-center gap-2 rounded border border-card-grid-item-border bg-white p-4 text-black">
                <span className="text-sm font-bold">{localizeWithFallback('catalog.layout.unavailable.title', 'Catalog page unavailable')}</span>
                <span className="text-xs text-muted">
                    {localizeWithFallback('catalog.layout.unavailable.description', 'This page is not supported by the current client yet.')}
                </span>
            </div>
        </div>
    </NativeTextTree>
);
