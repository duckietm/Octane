import { FC } from 'react';
import { Column, ColumnProps } from '../../../../../common';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useCatalogData } from '../../../../../hooks';
import { CatalogPriceDisplayWidgetView } from './CatalogPriceDisplayWidgetView';

interface CatalogSimplePriceWidgetViewProps extends ColumnProps {}
export const CatalogTotalPriceWidget: FC<CatalogSimplePriceWidgetViewProps> = (props) => {
    const { gap = 1, ...rest } = props;
    const { currentOffer = null } = useCatalogData();

    return (
        <NativeTextTree>
            <Column gap={gap} {...rest}>
                <CatalogPriceDisplayWidgetView offer={currentOffer} separator />
            </Column>
        </NativeTextTree>
    );
};
