import { GetRoomEngine, IRoomCameraWidgetEffect, IRoomCameraWidgetSelectedEffect, OctaneRectangle, RenderRoomMessageComposer } from '@octane/renderer';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';

// Client configuration: "server" (default) sends the AIR scene (RenderRoom with the zlib-deflated JSON) and
// the server renders the photo; "upload" renders the photo in the browser and uploads the PNG.
export const CAMERA_RENDER_MODE_KEY = 'camera.render.mode';

export type CameraRenderMode = 'upload' | 'server';

export const GetCameraRenderMode = (): CameraRenderMode =>
{
    const value = GetConfigurationValue<string>(CAMERA_RENDER_MODE_KEY, 'server');

    return ((typeof value === 'string') && (value.trim().toLowerCase() === 'upload')) ? 'upload' : 'server';
};

/**
 * AIR CameraPhotoLab.getEffectDataJson: the effects that are on, in the lab's effect order, as
 * {"name", "alpha": int(strength * 255)}, then the frame as {"name"} only.
 */
export const GetCameraEffectDataJson = (selectedEffects: IRoomCameraWidgetSelectedEffect[] = [], availableEffects: IRoomCameraWidgetEffect[] = []): string =>
{
    const order = (name: string) =>
    {
        const index = availableEffects.findIndex(effect => (effect.name === name));

        return ((index < 0) ? Number.MAX_SAFE_INTEGER : index);
    };

    const effects = [ ...(selectedEffects || []) ]
        .filter(selected => !!selected?.effect)
        .map((selected, index) => ({ selected, index }))
        .sort((a, b) => ((order(a.selected.effect.name) - order(b.selected.effect.name)) || (a.index - b.index)))
        .map(entry => entry.selected);

    const data: { name: string, alpha?: number }[] = [];

    for(const selected of effects)
    {
        if(selected.effect.type === 'frame') continue;

        data.push({ name: selected.effect.name, alpha: Math.trunc(selected.strength * 255) });
    }

    for(const selected of effects)
    {
        if(selected.effect.type !== 'frame') continue;

        data.push({ name: selected.effect.name });
    }

    return JSON.stringify(data);
};

/**
 * AIR CameraViewFinder at the shutter (and RoomThumbnailCameraWidget at capture): the room scene inside the
 * viewfinder frame, captured now because the room keeps moving. Null means AIR's camera.alert.too_much_stuff.
 */
export const CaptureCameraRenderMessage = (frame: InstanceType<typeof OctaneRectangle>, backgroundColor: number, isThumbnail: boolean = false): RenderRoomMessageComposer =>
{
    if(!frame) return null;

    try
    {
        const composer = GetRoomEngine().getRenderRoomMessage(frame, (backgroundColor || 0), isThumbnail);

        if(!composer || !composer.isSendable()) return null;

        return composer;
    }
    catch
    {
        return null;
    }
};

// AIR CameraWidget.sendPhotoData, when the purchase dialog opens: add the effects and zoom, pack again.
export const FinishCameraRenderMessage = (composer: RenderRoomMessageComposer, effectDataJson: string, zoom: number): boolean =>
{
    if(!composer) return false;

    try
    {
        composer.addEffectData(effectDataJson || '[]');
        composer.setZoom((zoom === 2) ? 2 : 1);
        composer.compressData();

        return composer.isSendable();
    }
    catch
    {
        return false;
    }
};
