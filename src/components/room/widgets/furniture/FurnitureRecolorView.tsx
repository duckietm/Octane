import { ColorConverter, GetRoomEngine, GetSessionDataManager, IRoomObject, RecolorFurniComposer, RoomObjectCategory, RoomObjectVariable } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import {
    distinctRecolors,
    isRecolorableClass,
    localizeWithFallback,
    NO_RECOLOR,
    RECOLOR_SCOPE_THIS,
    RECOLOR_SCOPES,
    recolorablePalette,
    recolorChannels,
    recolorHex,
    recolorOfData,
    SendMessageComposer
} from '../../../../api';
import { Button, LayoutColorSwatchView, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useFurnitureRecolorWidget } from '../../../../hooks';
import { Select } from '../../../../common/Select';

const WHITE = 0xffffff;

const SCOPE_FALLBACKS = ['Only this furni', 'Furni with the same color', 'Furni of the same type', 'Furni of the same type and color'];

const classNameOf = (object: IRoomObject): string =>
{
    const typeId = object?.model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID) ?? 0;

    return typeId > 0 ? (GetSessionDataManager().getFloorItemData(typeId)?.className ?? null) : null;
};

const recolorOf = (object: IRoomObject): number => recolorOfData(object?.model?.getValue<{ [key: string]: string }>(RoomObjectVariable.FURNITURE_DATA));

/**
 * The official recolour window for recolourable Builders Club furni: the furni's palette, the colours
 * already used in the room, and which furni the colour goes to.
 */
export const FurnitureRecolorView: FC = () =>
{
    const { objectId = -1, close = null } = useFurnitureRecolorWidget();
    const [, setTick] = useState(0);
    const [selected, setSelected] = useState(NO_RECOLOR);
    const [scope, setScope] = useState(RECOLOR_SCOPE_THIS);

    useEffect(() =>
    {
        setSelected(NO_RECOLOR);

        if (objectId === -1) return;

        const interval = setInterval(() => setTick((value) => value + 1), 500);

        return () => clearInterval(interval);
    }, [objectId]);

    if (objectId === -1) return null;

    const roomId = GetRoomEngine().activeRoomId;
    const object = GetRoomEngine().getRoomObject(roomId, objectId, RoomObjectCategory.FLOOR);
    const className = classNameOf(object);

    if (!object || !isRecolorableClass(className)) return null;

    const typeId = object.model.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID);
    const current = recolorOf(object);
    const palette = recolorablePalette(className);
    const roomColors = distinctRecolors(
        GetRoomEngine()
            .getRoomObjects(roomId, RoomObjectCategory.FLOOR)
            .filter((roomObject) => isRecolorableClass(classNameOf(roomObject)))
            .map((roomObject) => roomObject.model?.getValue<{ [key: string]: string }>(RoomObjectVariable.FURNITURE_DATA))
    ).filter((color) => palette.includes(color));
    const target = selected === NO_RECOLOR ? current : selected;

    const swatches = (colors: number[]) =>
        colors.map((color) => (
            <LayoutColorSwatchView
                key={color}
                active={color === target}
                color={ColorConverter.int2rgb(color)}
                title={recolorHex(color)}
                onClick={() => setSelected(color)}
            />
        ));

    const apply = () =>
    {
        if (target === NO_RECOLOR) return;

        const [red, green, blue] = recolorChannels(target);

        SendMessageComposer(new RecolorFurniComposer(objectId, scope, red, green, blue));
        setSelected(NO_RECOLOR);
    };

    return (
        <OctaneCardView className="octane-furni-recolor" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('furniture.recolor.title', 'Recolor furniture')} onCloseClick={close} />
            <OctaneCardContentView gap={2}>
                <Text bold small>
                    {localizeWithFallback('furniture.recolor.preview', 'Preview')}
                </Text>
                <div className="flex items-center justify-center gap-3">
                    <div className="octane-color-preview-box">
                        <LayoutFurniImageView productClassId={typeId} productType="s" recolor={current === NO_RECOLOR ? WHITE : current} />
                    </div>
                    <FaArrowRight className="octane-color-preview-arrow" />
                    <div className="octane-color-preview-box">
                        <LayoutFurniImageView productClassId={typeId} productType="s" recolor={target === NO_RECOLOR ? WHITE : target} />
                    </div>
                </div>
                <Text bold small>
                    {localizeWithFallback('furniture.recolor.palette', 'Palette')}
                </Text>
                <div className="octane-color-swatch-grid">{swatches(palette)}</div>
                <Text bold small>
                    {localizeWithFallback('furniture.recolor.room_colors', 'Colors in this room')}
                </Text>
                <div className="octane-color-swatch-grid is-room">{swatches(roomColors)}</div>
                <Text bold small>
                    {localizeWithFallback('furniture.recolor.scope', 'Apply to:')}
                </Text>
                <div className="flex items-center gap-2">
                    <Select className="form-select form-select-sm grow" value={scope} onChange={(event) => setScope(Number(event.target.value))}>
                        {RECOLOR_SCOPES.map((value) => (
                            <option key={value} value={value}>
                                {localizeWithFallback(`furniture.recolor.scope.${value}`, SCOPE_FALLBACKS[value])}
                            </option>
                        ))}
                    </Select>
                    <Button disabled={target === NO_RECOLOR || (target === current && scope === RECOLOR_SCOPE_THIS)} variant="success" onClick={apply}>
                        {localizeWithFallback('furniture.recolor.apply', 'Apply')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
