import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { OctaneButton } from '../../../layout';

export interface InventoryCategoryEmptyViewProps {
    title: string;
    desc: string;
}

export const InventoryCategoryEmptyView: FC<InventoryCategoryEmptyViewProps> = (props) => {
    const { title = '', desc = '' } = props;

    return (
        <div className="octane-inventory-empty">
            <div className="octane-inventory-empty-image" aria-hidden="true" />
            <div className="octane-inventory-empty-copy">
                <div className="octane-inventory-empty-title">{title}</div>
                <div className="octane-inventory-empty-desc">{desc}</div>
            </div>
            <OctaneButton className="octane-inventory-empty-shop" onClick={() => CreateLinkEvent('catalog/toggle/normal')}>
                {LocalizeText('inventory.open.catalog')}
            </OctaneButton>
        </div>
    );
};
