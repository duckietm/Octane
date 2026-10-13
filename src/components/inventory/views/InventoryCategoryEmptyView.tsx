import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { OctaneButton } from '../../../layout';

export interface InventoryCategoryEmptyViewProps {
    title: string;
    desc: string;
    /** What the button does and says; it opens the catalog when left out. */
    actionLabel?: string;
    onAction?: () => void;
}

export const InventoryCategoryEmptyView: FC<InventoryCategoryEmptyViewProps> = (props) => {
    const { title = '', desc = '', actionLabel = null, onAction = null } = props;

    return (
        <div className="octane-inventory-empty">
            <div className="octane-inventory-empty-image" aria-hidden="true" />
            <div className="octane-inventory-empty-copy">
                <div className="octane-inventory-empty-title">{title}</div>
                <div className="octane-inventory-empty-desc">{desc}</div>
            </div>
            <OctaneButton className="octane-inventory-empty-shop" onClick={onAction ?? (() => CreateLinkEvent('catalog/toggle/normal'))}>
                {actionLabel ?? LocalizeText('inventory.open.catalog')}
            </OctaneButton>
        </div>
    );
};
