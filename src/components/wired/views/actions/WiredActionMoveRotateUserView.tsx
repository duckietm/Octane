import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, LocalizeText, WiredActionLayoutCode, WiredFurniType } from '../../../../api';
import iconRotateClockwise from '../../../../assets/images/wired/icon_wired_rotate_clockwise.png';
import iconRotateCounterClockwise from '../../../../assets/images/wired/icon_wired_rotate_counter_clockwise.png';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { NitroInput } from '../../../../layout';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon } from '../WiredDirectionIcon';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const ROTATION_CLOCKWISE = 8;
const ROTATION_COUNTER_CLOCKWISE = 9;

interface DirectionExtraOption {
    value: number;
    icon: string;
    label: string;
}

interface DirectionPickerProps {
    name: string;
    title: string;
    noneLabel: string;
    value: number;
    onChange: (value: number) => void;
    extraOptions?: DirectionExtraOption[];
}

const DirectionPicker: FC<DirectionPickerProps> = (props) => {
    const { name = '', title = '', noneLabel = '', value = -1, onChange = null, extraOptions = [] } = props;

    return (
        <div className="flex flex-col gap-2">
            <Text bold>{title}</Text>
            <label className="flex items-center gap-2 text-[12px]">
                <input checked={value === -1} className="form-check-input" name={name} type="radio" onChange={() => onChange(-1)} />
                <span>{noneLabel}</span>
            </label>
            <div className="grid grid-cols-4 gap-2 max-w-[240px]">
                {WIRED_DIRECTION_GRID.flatMap((row, rowIndex) =>
                    row.map((direction, columnIndex) => {
                        if (direction === null) {
                            return <div key={`${name}-empty-${rowIndex}-${columnIndex}`} />;
                        }

                        const selected = value === direction;

                        return (
                            <label key={`${name}-${direction}`} className="flex items-center justify-center gap-[2px] cursor-pointer">
                                <input checked={selected} className="form-check-input" name={name} type="radio" onChange={() => onChange(direction)} />
                                <span className="inline-flex items-center justify-center">
                                    <WiredDirectionIcon direction={direction} selected={selected} />
                                </span>
                            </label>
                        );
                    })
                )}
            </div>
            {extraOptions.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {extraOptions.map((option) => (
                        <label key={`${name}-extra-${option.value}`} className="flex items-center gap-[2px] cursor-pointer" title={option.label}>
                            <input
                                checked={value === option.value}
                                className="form-check-input"
                                name={name}
                                type="radio"
                                onChange={() => onChange(option.value)}
                            />
                            <img alt="" className="h-auto w-auto object-contain" draggable={false} src={option.icon} />
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

const MIN_TILE_COUNT = 1;
const MAX_TILE_COUNT = 10;

const clampTileCount = (value: number) => {
    if (isNaN(value)) return MIN_TILE_COUNT;

    return Math.max(MIN_TILE_COUNT, Math.min(MAX_TILE_COUNT, Math.floor(value)));
};

export const WiredActionMoveRotateUserView: FC<{}> = (props) => {
    const [movementDirection, setMovementDirection] = useState(-1);
    const [rotationDirection, setRotationDirection] = useState(-1);
    const { trigger = null, setIntParams = null } = useWired();
    /**
     * "Move user N tiles" reads a fourth slot the window never sent, so it always moved exactly one
     * tile whatever the box was meant to do. The server keeps it between 1 and 10.
     */
    const hasTileCount = trigger?.code === WiredActionLayoutCode.MOVE_USER_TILES;
    const [tileCount, setTileCount] = useState(MIN_TILE_COUNT);
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 2) return trigger.intData[2];
        return 0;
    });

    const save = () =>
        setIntParams(
            hasTileCount
                ? [movementDirection, rotationDirection, userSource, tileCount]
                : [movementDirection, rotationDirection, userSource]
        );

    const rotationExtraOptions: DirectionExtraOption[] = [
        { value: ROTATION_CLOCKWISE, icon: iconRotateClockwise, label: LocalizeText('wiredfurni.params.rotatefurni.1') },
        { value: ROTATION_COUNTER_CLOCKWISE, icon: iconRotateCounterClockwise, label: LocalizeText('wiredfurni.params.rotatefurni.2') }
    ];

    useEffect(() => {
        setMovementDirection(trigger.intData.length > 0 ? trigger.intData[0] : -1);
        setRotationDirection(trigger.intData.length > 1 ? trigger.intData[1] : -1);
        setUserSource(trigger.intData.length > 2 ? trigger.intData[2] : 0);
        setTileCount(clampTileCount(trigger.intData.length > 3 ? trigger.intData[3] : MIN_TILE_COUNT));
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <DirectionPicker
                name="wired-move-user-direction"
                title={LocalizeText('wiredfurni.params.moveuser')}
                noneLabel={LocalizeText('wiredfurni.params.movefurni.0')}
                value={movementDirection}
                onChange={setMovementDirection}
            />
            <DirectionPicker
                name="wired-rotate-user-direction"
                title={LocalizeText('wiredfurni.params.rotateuser')}
                noneLabel={LocalizeText('wiredfurni.params.rotatefurni.0')}
                extraOptions={rotationExtraOptions}
                value={rotationDirection}
                onChange={setRotationDirection}
            />
            {hasTileCount && (
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.tilecount', 'Tiles to move')}</Text>
                    <NitroInput
                        max={MAX_TILE_COUNT}
                        min={MIN_TILE_COUNT}
                        type="number"
                        value={tileCount}
                        onChange={(event) => setTileCount(clampTileCount(parseInt(event.target.value)))}
                    />
                </div>
            )}
        </WiredActionBaseView>
    );
};
