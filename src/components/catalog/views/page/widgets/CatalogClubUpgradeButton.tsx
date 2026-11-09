import { CreateLinkEvent } from '@octane/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../../api';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

interface CatalogClubUpgradeButtonProps {
    onOpenClubCenter?: () => void;
}

// Replaces the purchase buttons of an offer the player's club level does not unlock: a short
// explanation and one button that opens the club centre.
export const CatalogClubUpgradeButton: FC<CatalogClubUpgradeButtonProps> = ({ onOpenClubCenter = () => CreateLinkEvent('habboUI/open/hccenter') }) => (
    <NativeTextTree>
        <div className="octane-catalog-club-upgrade flex min-w-0 grow items-center justify-end gap-2">
            <span className="octane-catalog-club-upgrade-caption min-w-0 truncate">
                {LocalizeText('catalog.buy.widget.get.vip.to.unlock.this.product')}
            </span>
            <BaseButton className="octane-catalog-standard-button octane-catalog-club-upgrade-button shrink-0" type="button" onClick={onOpenClubCenter}>
                {LocalizeText('catalog.buy.widget.get.vip.button')}
            </BaseButton>
        </div>
    </NativeTextTree>
);
