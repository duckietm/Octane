import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import {
    WIRED_MOVE_DIAG_ICON,
    WIRED_MOVE_ICONS,
    WIRED_MOVE_RND_ICON,
    WIRED_MOVE_VRT_ICON,
    WIRED_ROTATE_CCW_ICON,
    WIRED_ROTATE_CW_ICON,
    WiredIconRadioGroup,
    WiredIconRadioOption
} from '../WiredMoveIconRadios';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

/**
 * Official WiredActionMoveFurni: one 4-column group, "no movement" on its own row, then the
 * movements in the order 4 8 5 9 / 6 10 7 11 / 2 3 1 with the move_* assets.
 */
const MOVEMENT_ICONS: [number, string][] = [
    [4, WIRED_MOVE_ICONS[0]],
    [8, WIRED_MOVE_ICONS[1]],
    [5, WIRED_MOVE_ICONS[2]],
    [9, WIRED_MOVE_ICONS[3]],
    [6, WIRED_MOVE_ICONS[4]],
    [10, WIRED_MOVE_ICONS[5]],
    [7, WIRED_MOVE_ICONS[6]],
    [11, WIRED_MOVE_ICONS[7]],
    [2, WIRED_MOVE_DIAG_ICON],
    [3, WIRED_MOVE_VRT_ICON],
    [1, WIRED_MOVE_RND_ICON]
];

const ROTATION_ICONS: Record<number, string> = { 1: WIRED_ROTATE_CW_ICON, 2: WIRED_ROTATE_CCW_ICON };

const rotationOptions: number[] = [0, 1, 2, 3];

export const WiredActionMoveFurniView: FC<{}> = (props) => {
    const [movement, setMovement] = useState(0);
    const [rotation, setRotation] = useState(0);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    // Official layout: [movement, rotation] (both 0 by default); the furni source is the official slot.
    const save = () => {
        setIntParams([movement, rotation]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        setMovement(trigger?.intData?.[0] ?? 0);
        setRotation(trigger?.intData?.[1] ?? 0);
        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const movementOptions: WiredIconRadioOption[] = [
        { value: 0, label: LocalizeText('wiredfurni.params.movefurni.0'), newLine: true },
        ...MOVEMENT_ICONS.map(([value, icon]) => ({ value, icon }))
    ];
    const rotationRadioOptions: WiredIconRadioOption[] = rotationOptions.map((value) => ({
        value,
        icon: ROTATION_ICONS[value],
        label: LocalizeText(`wiredfurni.params.rotatefurni.${value}`)
    }));

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT;

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={requiresFurni}
                save={save}
                footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.movefurni')}</Text>
                    <WiredIconRadioGroup name="movement" options={movementOptions} value={movement} onChange={setMovement} />
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.rotatefurni')}</Text>
                    <WiredIconRadioGroup columns={1} name="rotation" options={rotationRadioOptions} value={rotation} onChange={setRotation} />
                </div>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
