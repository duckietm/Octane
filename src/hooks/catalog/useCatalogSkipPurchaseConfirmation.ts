import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { LocalStorageKeys } from '../../api';
import { useLocalStorage } from '../useLocalStorage';

const useCatalogSkipPurchaseConfirmationState = () => useLocalStorage(LocalStorageKeys.CATALOG_SKIP_PURCHASE_CONFIRMATION, false);

export const useCatalogSkipPurchaseConfirmation = () => useSharedHook(useCatalogSkipPurchaseConfirmationState);

registerSharedHook(useCatalogSkipPurchaseConfirmationState);
