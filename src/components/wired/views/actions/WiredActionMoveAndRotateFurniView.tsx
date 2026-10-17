import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon } from '../WiredDirectionIcon';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';

const rotationOptions: number[] = [0, 1, 2, 3, 4, 5, 6];

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
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.startdir')}</Text>
                <div className="grid grid-cols-4 gap-2 max-w-[240px]">
                    {WIRED_DIRECTION_GRID.flatMap((row, rowIndex) =>
                        row.map((direction, columnIndex) => {
                            if (direction === null) {
                                return <div key={`move-to-dir-empty-${rowIndex}-${columnIndex}`} />;
                            }

                            return (
                                <label key={`move-to-dir-${direction}`} className="flex items-center justify-center gap-[2px] cursor-pointer">
                                    <Radio checked={movement === direction} id={`movement${direction}`} name="movement" onCheckedChange={() => setMovement(direction)} />
                                    <span className="inline-flex items-center justify-center">
                                        <WiredDirectionIcon direction={direction} selected={movement === direction} />
                                    </span>
                                </label>
                            );
                        })
                    )}
                </div>
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
    );
};
