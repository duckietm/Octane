import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, LocalizeText, WiredActionLayoutCode, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import {
    WIRED_MOVE_ICONS,
    WIRED_ROTATE_CCW_ICON,
    WIRED_ROTATE_CW_ICON,
    WIRED_SEQUENTIAL_DIRECTIONS,
    WiredIconRadioGroup,
    WiredIconRadioOption
} from '../WiredMoveIconRadios';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

// The official turn values (ours on the server are 8 and 9; the server converts).
const ROTATION_CLOCKWISE = 9;
const ROTATION_COUNTER_CLOCKWISE = 10;

const DIRECTION_OPTIONS: WiredIconRadioOption[] = WIRED_SEQUENTIAL_DIRECTIONS.map((direction) => ({ value: direction, icon: WIRED_MOVE_ICONS[direction] }));

const MIN_TILE_COUNT = 1;
const MAX_TILE_COUNT = 10;

const clampTileCount = (value: number) => {
    if (isNaN(value)) return MIN_TILE_COUNT;

    return Math.max(MIN_TILE_COUNT, Math.min(MAX_TILE_COUNT, Math.floor(value)));
};

export const WiredActionMoveRotateUserView: FC<{}> = (props) => {
    const [movementDirection, setMovementDirection] = useState(-1);
    const [rotationDirection, setRotationDirection] = useState(-1);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    /**
     * "Move user N tiles" reads a fourth slot the window never sent, so it always moved exactly one
     * tile whatever the box was meant to do. The server keeps it between 1 and 10.
     */
    const hasTileCount = trigger?.code === WiredActionLayoutCode.MOVE_USER_TILES;
    const [tileCount, setTileCount] = useState(MIN_TILE_COUNT);
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger));

    // Official layout: [movement, rotation]; ours (move user N tiles) follows: [tiles]. The user source
    // is the official source slot.
    const save = () => {
        setIntParams(hasTileCount ? [movementDirection, rotationDirection, tileCount] : [movementDirection, rotationDirection]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    // Official: "no movement" / "no rotation" on a row of their own, then 0..7 in rows 0-3 / 4-7.
    const movementOptions: WiredIconRadioOption[] = [{ value: -1, label: LocalizeText('wiredfurni.params.movefurni.0'), newLine: true }, ...DIRECTION_OPTIONS];
    const rotationOptions: WiredIconRadioOption[] = [
        { value: -1, label: LocalizeText('wiredfurni.params.rotatefurni.0'), newLine: true },
        ...DIRECTION_OPTIONS,
        { value: ROTATION_CLOCKWISE, icon: WIRED_ROTATE_CW_ICON },
        { value: ROTATION_COUNTER_CLOCKWISE, icon: WIRED_ROTATE_CCW_ICON }
    ];

    useEffect(() => {
        setMovementDirection(trigger.intData.length > 0 ? trigger.intData[0] : -1);
        setRotationDirection(trigger.intData.length > 1 ? trigger.intData[1] : -1);
        setUserSource(slotUserSource(trigger));
        setTileCount(clampTileCount(trigger.intData.length > 2 ? trigger.intData[2] : MIN_TILE_COUNT));
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.moveuser')}</Text>
                    <WiredIconRadioGroup name="wired-move-user-direction" options={movementOptions} value={movementDirection} onChange={setMovementDirection} />
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.rotateuser')}</Text>
                    <WiredIconRadioGroup
                        name="wired-rotate-user-direction"
                        options={rotationOptions}
                        value={rotationDirection}
                        onChange={setRotationDirection}
                    />
                </div>
                {hasTileCount && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.tilecount', 'Tiles to move')}</Text>
                        <OctaneInput
                            max={MAX_TILE_COUNT}
                            min={MIN_TILE_COUNT}
                            type="number"
                            value={tileCount}
                            onChange={(event) => setTileCount(clampTileCount(parseInt(event.target.value)))}
                        />
                    </div>
                )}
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
