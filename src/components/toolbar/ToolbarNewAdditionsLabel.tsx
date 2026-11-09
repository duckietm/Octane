import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useCatalogNewAdditionsStore } from '../../hooks/catalog/catalogNewAdditionsStore';
import { isNewAdditionsNotificationEnabled } from '../../hooks/catalog/useCatalogNewAdditions';

/**
 * AIR `BottomBarLeft` new_items_label (habbo-toolbar-com `new_items_label_xml`): a red 27x20 label with
 * `toolbar.new_additions.notification` at the top right of the catalogue icon, shown on CATALOG_NEW_ITEMS_SHOW and
 * hidden on CATALOG_NEW_ITEMS_HIDE, only while `toolbar.new_additions.notification.enabled`.
 */
export const ToolbarNewAdditionsLabel: FC = () => {
    const available = useCatalogNewAdditionsStore((state) => state.available);

    if (!available || !isNewAdditionsNotificationEnabled()) return null;

    return (
        <NativeTextTree>
            <span aria-hidden className="octane-toolbar-new-additions pointer-events-none">
                {localizeWithFallback('toolbar.new_additions.notification', 'New')}
            </span>
        </NativeTextTree>
    );
};
