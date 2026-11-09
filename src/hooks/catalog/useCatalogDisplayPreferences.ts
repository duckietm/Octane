import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { LocalStorageKeys } from '../../api';
import { useLocalStorage } from '../useLocalStorage';

export type CatalogGridDensity = 'compact' | 'standard' | 'large';

export interface CatalogGridMetrics {
    columnCount: number;
    columnMinHeight: number;
    columnMinWidth: number;
}

export const getCatalogGridMetrics = (density: CatalogGridDensity): CatalogGridMetrics => {
    switch (density) {
        case 'compact':
            return { columnCount: 7, columnMinHeight: 64, columnMinWidth: 45 };
        case 'large':
            return { columnCount: 5, columnMinHeight: 92, columnMinWidth: 68 };
        case 'standard':
        default:
            return { columnCount: 6, columnMinHeight: 74, columnMinWidth: 53 };
    }
};

const useCatalogDisplayPreferencesState = () => {
    const [density, setDensity] = useLocalStorage<CatalogGridDensity>(LocalStorageKeys.CATALOG_GRID_DENSITY, 'standard');
    const [showTilePrices, setShowTilePrices] = useLocalStorage(LocalStorageKeys.CATALOG_SHOW_TILE_PRICES, true);

    return { density, setDensity, showTilePrices, setShowTilePrices };
};

export const useCatalogDisplayPreferences = () => useSharedHook(useCatalogDisplayPreferencesState);

registerSharedHook(useCatalogDisplayPreferencesState);
