import { FC } from 'react';
import { IPurchasableOffer } from '../../../../../api';
import { LayoutGridItemProps } from '../../../../../common';
import { useCatalogActions, useCatalogUiState } from '../../../../../hooks';
import { CatalogOfferTileView } from './CatalogOfferTileView';

interface CatalogGridOfferViewProps extends LayoutGridItemProps {
    offer: IPurchasableOffer;
    selectOffer: (offer: IPurchasableOffer) => void;
    inventoryVisible: boolean;
    tintColor?: string;
    showTechnicalDetails?: boolean;
    showPrices?: boolean;
}

export const CatalogGridOfferView: FC<CatalogGridOfferViewProps> = (props) => {
    const { requestOfferToMover = null } = useCatalogActions();
    const { currentType } = useCatalogUiState();

    return (
        <CatalogOfferTileView {...props} requestOfferToMover={requestOfferToMover} currentType={currentType} />
    );
};
