import { FC } from 'react';
import { localizeWithFallback } from '../../../api';

/** AIR `inventory.xml` loading_container: the download arrow a tab shows until its first list arrives. */
export const InventoryCategoryLoadingView: FC = () => (
    <div aria-label={localizeWithFallback('generic.loading', 'Loading...')} className="octane-inventory-loading" role="status" />
);
