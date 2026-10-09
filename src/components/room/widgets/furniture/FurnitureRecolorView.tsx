import {
    BuildersClubRecolorFurniMessageComposer,
    ColorConverter,
    GetRoomEngine,
    GetSessionDataManager,
    IFurnitureData,
    RoomObjectCategory,
    RoomObjectVariable
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FaArrowRight } from 'react-icons/fa';
import {
    colorIndexesInRoom,
    localizeWithFallback,
    RECOLOR_SCOPE_SAME_IN_ROOM,
    RECOLOR_SCOPE_THIS,
    recolorSwatch,
    recolorVariants,
    SendMessageComposer
} from '../../../../api';
import { Button, LayoutColorSwatchView, LayoutFurniImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useFurnitureRecolorWidget } from '../../../../hooks';

const floorFurniData = (roomId: number, objectId: number): IFurnitureData =>
{
    const object = GetRoomEngine().getRoomObject(roomId, objectId, RoomObjectCategory.FLOOR);
    const typeId = object?.model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID) ?? 0;

    return typeId > 0 ? GetSessionDataManager().getFloorItemData(typeId) : null;
};

export const FurnitureRecolorView: FC = () =>
{
    const { objectId = -1, close = null } = useFurnitureRecolorWidget();
    const [, setTick] = useState(0);
    const [selected, setSelected] = useState(-1);
    const [scope, setScope] = useState(RECOLOR_SCOPE_THIS);

    useEffect(() =>
    {
        if (objectId === -1) return;

        const interval = setInterval(() => setTick((value) => value + 1), 500);

        return () => clearInterval(interval);
    }, [objectId]);

    const roomId = GetRoomEngine().activeRoomId;
    const current = objectId === -1 ? null : floorFurniData(roomId, objectId);
    const className = current?.hasIndexedColor ? current.className : null;
    const variants = className ? recolorVariants(GetSessionDataManager().getAllFurnitureData(), className) : [];
    const roomColors = className
        ? colorIndexesInRoom(
            GetRoomEngine()
                .getRoomObjects(roomId, RoomObjectCategory.FLOOR)
                .map((object) => GetSessionDataManager().getFloorItemData(object?.model?.getValue<number>(RoomObjectVariable.FURNITURE_TYPE_ID) ?? 0)),
            className
        )
        : [];

    if (objectId === -1 || !current || !className) return null;

    const target = variants.find((data) => data.colorIndex === selected) ?? null;
    const swatches = (indexes: number[]) =>
        indexes
            .map((index) => variants.find((data) => data.colorIndex === index))
            .filter((data) => !!data)
            .map((data) => (
                <LayoutColorSwatchView
                    key={data.colorIndex}
                    active={data.colorIndex === selected}
                    color={ColorConverter.int2rgb(recolorSwatch(data))}
                    title={data.name}
                    onClick={() => setSelected(data.colorIndex)}
                />
            ));

    const apply = () =>
    {
        if (!target || target.colorIndex === current.colorIndex) return;

        SendMessageComposer(new BuildersClubRecolorFurniMessageComposer(objectId, target.colorIndex, scope));
    };

    return (
        <OctaneCardView className="octane-furni-recolor" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('builder.recolor.title', 'Recolor furniture')} onCloseClick={close} />
            <OctaneCardContentView gap={2}>
                <Text bold small>
                    {localizeWithFallback('builder.recolor.preview', 'Preview')}
                </Text>
                <div className="flex items-center justify-center gap-3">
                    <div className="octane-color-preview-box">
                        <LayoutFurniImageView productClassId={current.id} productType="s" />
                    </div>
                    <FaArrowRight className="octane-color-preview-arrow" />
                    <div className="octane-color-preview-box">
                        <LayoutFurniImageView productClassId={(target ?? current).id} productType="s" />
                    </div>
                </div>
                <Text bold small>
                    {localizeWithFallback('builder.palette.title', 'Palette')}
                </Text>
                <div className="octane-color-swatch-grid">{swatches(variants.map((data) => data.colorIndex))}</div>
                <Text bold small>
                    {localizeWithFallback('builder.recolor.room_colors', 'Colors in this room')}
                </Text>
                <div className="octane-color-swatch-grid is-room">{swatches(roomColors)}</div>
                <Text bold small>
                    {localizeWithFallback('builder.recolor.apply_to', 'Apply to:')}
                </Text>
                <div className="flex items-center gap-2">
                    <select className="form-select form-select-sm grow" value={scope} onChange={(event) => setScope(Number(event.target.value))}>
                        <option value={RECOLOR_SCOPE_THIS}>{localizeWithFallback('builder.recolor.apply_to.this', 'Only this furniture')}</option>
                        <option value={RECOLOR_SCOPE_SAME_IN_ROOM}>{localizeWithFallback('builder.recolor.apply_to.same', 'All of these in this room')}</option>
                    </select>
                    <Button disabled={!target || target.colorIndex === current.colorIndex} variant="success" onClick={apply}>
                        {localizeWithFallback('builder.recolor.apply', 'Apply')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
