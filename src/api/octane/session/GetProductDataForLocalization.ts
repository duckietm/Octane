import { GetSessionDataManager, IProductData } from '@octane/renderer';

export function GetProductDataForLocalization(localizationId: string): IProductData {
    if (!localizationId) return null;

    return GetSessionDataManager().getProductData(localizationId);
}
