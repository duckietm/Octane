import { FC, useEffect, useState } from 'react';
import { FaArrowDown, FaArrowLeft, FaArrowRight, FaArrowUp } from 'react-icons/fa';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

const MAX_DISTANCE = 20;

// Official order: the positive direction first, then the negative one.
const HORIZONTAL_OPTIONS = [
    { value: 1, icon: <FaArrowRight /> },
    { value: 0, icon: <FaArrowLeft /> }
];

const VERTICAL_OPTIONS = [
    { value: 1, icon: <FaArrowUp /> },
    { value: 0, icon: <FaArrowDown /> }
];

const normalizeDistance = (value: number) => {
    if (isNaN(value)) return 0;

    return Math.max(0, Math.min(MAX_DISTANCE, value));
};

export const WiredActionRelativeMoveView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();

    const [horizontalDirection, setHorizontalDirection] = useState(1);
    const [horizontalDistance, setHorizontalDistance] = useState(0);
    const [verticalDirection, setVerticalDirection] = useState(1);
    const [verticalDistance, setVerticalDistance] = useState(0);
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    useEffect(() => {
        if (!trigger) return;

        // Official layout: [horizontal, vertical], each a signed number of tiles (negative: the second
        // option); the furni source is the official source slot.
        const horizontal = trigger.intData?.[0] ?? 0;
        const vertical = trigger.intData?.[1] ?? 0;

        setHorizontalDirection(horizontal < 0 ? 0 : 1);
        setHorizontalDistance(normalizeDistance(Math.abs(horizontal)));
        setVerticalDirection(vertical < 0 ? 0 : 1);
        setVerticalDistance(normalizeDistance(Math.abs(vertical)));
        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    const save = () => {
        setIntParams([horizontalDirection === 0 ? -horizontalDistance : horizontalDistance, verticalDirection === 0 ? -verticalDistance : verticalDistance]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.movement.horizontal.selection')}</Text>
                <div className="flex gap-2">
                    {HORIZONTAL_OPTIONS.map((option) => {
                        return (
                            <label key={option.value} className="flex items-center gap-1">
                                <Radio checked={horizontalDirection === option.value} name="relativeMoveHorizontal" onCheckedChange={() => setHorizontalDirection(option.value)} />
                                <Text>{option.icon}</Text>
                            </label>
                        );
                    })}
                </div>
                <Text>{LocalizeText('wiredfurni.params.movement.horizontal.distance', ['distance'], [horizontalDistance.toString()])}</Text>
                <Slider max={MAX_DISTANCE} min={0} step={1} value={horizontalDistance} onChange={(value) => setHorizontalDistance(value as number)} />
            </div>
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.movement.vertical.selection')}</Text>
                <div className="flex gap-2">
                    {VERTICAL_OPTIONS.map((option) => {
                        return (
                            <label key={option.value} className="flex items-center gap-1">
                                <Radio checked={verticalDirection === option.value} name="relativeMoveVertical" onCheckedChange={() => setVerticalDirection(option.value)} />
                                <Text>{option.icon}</Text>
                            </label>
                        );
                    })}
                </div>
                <Text>{LocalizeText('wiredfurni.params.movement.vertical.distance', ['distance'], [verticalDistance.toString()])}</Text>
                <Slider max={MAX_DISTANCE} min={0} step={1} value={verticalDistance} onChange={(value) => setVerticalDistance(value as number)} />
            </div>
        </WiredActionBaseView>
    );
};
