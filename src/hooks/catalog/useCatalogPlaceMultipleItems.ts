import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { LocalStorageKeys } from '../../api';
import { useLocalStorage } from '../useLocalStorage';

const useCatalogPlaceMultipleItemsState = () => useLocalStorage(LocalStorageKeys.CATALOG_PLACE_MULTIPLE_OBJECTS, false);

export const useCatalogPlaceMultipleItems = () => useSharedHook(useCatalogPlaceMultipleItemsState);

registerSharedHook(useCatalogPlaceMultipleItemsState);
