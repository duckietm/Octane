import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_MOVE_ICONS, WIRED_SEQUENTIAL_DIRECTIONS, WiredIconRadioGroup } from '../WiredMoveIconRadios';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

const rotationOptions: number[] = [0, 1, 2, 3, 4, 5, 6];

// Official: the start directions 0..7 as move_* icons, 4 per row in order.
const START_DIRECTION_OPTIONS = WIRED_SEQUENTIAL_DIRECTIONS.map((direction) => ({ value: direction, icon: WIRED_MOVE_ICONS[direction] }));

export const WiredActionMoveAndRotateFurniView: FC<{}> = (props) => {
    const [movement, setMovement] = useState(0);
    const [rotation, setRotation] = useState(0);
    const [blockOnUserCollision, setBlockOnUserCollision] = useState(false);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    // Official layout: [start direction, turn, stop on user collision]; the furni source is the
    // official source slot.
    const save = () => {
        setIntParams([movement, rotation, blockOnUserCollision ? 1 : 0]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        if (trigger.intData.length >= 2) {
            setMovement(trigger.intData[0]);
            setRotation(trigger.intData[1]);
        } else {
            setMovement(0);
            setRotation(0);
        }

        setFurniSource(slotFurniSource(trigger));
        setBlockOnUserCollision(trigger.intData?.[2] === 1);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

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
                    <Text bold>{LocalizeText('wiredfurni.params.startdir')}</Text>
                    <WiredIconRadioGroup name="movement" options={START_DIRECTION_OPTIONS} value={movement} onChange={setMovement} />
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.turn')}</Text>
                    {rotationOptions.map((option) => {
                        return (
                            <div key={option} className="flex items-center gap-1">
                                <Radio checked={rotation === option} id={`rotation${option}`} name="rotation" onCheckedChange={() => setRotation(option)} />
                                <Text>{LocalizeText(`wiredfurni.params.turn.${option}`)}</Text>
                            </div>
                        );
                    })}
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.user_collide')}</Text>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Checkbox checked={blockOnUserCollision} onCheckedChange={(nextChecked) => setBlockOnUserCollision(nextChecked)} />
                        <Text>{LocalizeText('wiredfurni.params.user_collide.0')}</Text>
                    </label>
                </div>
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
