import { RoomObjectCategory, RoomObjectOperationType } from '@octane/renderer';
import { useCallback } from 'react';
import {
    expandLocalizedText,
    GetConfigurationValue,
    GetFurnitureDataForRoomObject,
    GetRoomSession,
    IsBuildersClubFurniId,
    isWebApiBoxClassName,
    localizeWithFallback,
    ProcessRoomObjectOperation
} from '../../../api';
import { useNotification } from '../../notification';

const localizeText = (key: string, fallback: string): string =>
    expandLocalizedText(localizeWithFallback(key, fallback), (nested) => localizeWithFallback(nested, '') || null);

/** Whether any of these room objects is a Variables Web API add-on, whose keys die with a pickup. */
export const hasWebApiBox = (objectIds: number[], category: number = RoomObjectCategory.FLOOR): boolean => {
    const roomId = GetRoomSession()?.roomId;

    if (!roomId) return false;

    return objectIds.some((objectId) => isWebApiBoxClassName(GetFurnitureDataForRoomObject(roomId, objectId, category)?.className));
};

/**
 * Official InfoStandWidgetHandler.pickupObjectWithConfirmation: picking up a Builders Club furni (an id of the band)
 * whose furnidata is not in the warehouse (`bc="1"`) asks `room.confirm.not_in_warehouse` first, while the Builders
 * Club catalogue is enabled. Picking it up deletes it; the warehouse could not place it again.
 */
export const needsWarehouseConfirm = (
    objectId: number,
    availableForBuildersClub: boolean | undefined,
    buildersClubEnabled: boolean
): boolean => buildersClubEnabled && IsBuildersClubFurniId(objectId) && !availableForBuildersClub;

const isBuildersClubEnabled = (): boolean =>
    GetConfigurationValue<boolean>('buildersclub.enabled', GetConfigurationValue<boolean>('toolbar.buildersclub.enabled', true));

/** Picking up a web api box first asks (`wiredfurni.web_api.pickup.*`); everything else goes straight through. */
export const useFurniPickupGuard = () => {
    const { showConfirm = null } = useNotification();

    const confirmIfWebApiBox = useCallback(
        (objectIds: number[], category: number, proceed: () => void) => {
            if (!showConfirm || !hasWebApiBox(objectIds, category)) {
                proceed();
                return;
            }

            showConfirm(
                localizeText(
                    'wiredfurni.web_api.pickup.body',
                    'Are you sure you want to pick up this add-on? The Web API will stop working for this room, and the keys will be different when placing it again.'
                ),
                proceed,
                null,
                null,
                null,
                localizeText('wiredfurni.web_api.pickup.title', 'Removing a Web API Add-On')
            );
        },
        [showConfirm]
    );

    const pickupRoomObject = useCallback(
        (objectId: number, category: number, operation: string = RoomObjectOperationType.OBJECT_PICKUP) => {
            const pickup = () =>
                confirmIfWebApiBox([objectId], category, () => ProcessRoomObjectOperation(objectId, category, operation));
            const roomId = GetRoomSession()?.roomId;
            const furniData = roomId ? GetFurnitureDataForRoomObject(roomId, objectId, category) : null;

            if (
                !showConfirm ||
                operation !== RoomObjectOperationType.OBJECT_PICKUP ||
                !needsWarehouseConfirm(objectId, furniData?.availableForBuildersClub, isBuildersClubEnabled())
            ) {
                pickup();
                return;
            }

            showConfirm(
                localizeText(
                    'room.confirm.not_in_warehouse',
                    'This furni is not in the Builders Club warehouse. If you pick it up you cannot place it again. Continue?'
                ),
                pickup,
                null,
                null,
                null,
                localizeText('generic.alert.title', 'Notice')
            );
        },
        [confirmIfWebApiBox, showConfirm]
    );

    return { pickupRoomObject, confirmIfWebApiBox };
};
