import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

// Game timers and the football, Banzai and Freeze counters as well as the clock counter.

const CONTROL_OPTIONS = [
    { value: 0, label: 'wiredfurni.params.clock_control.0' },
    { value: 1, label: 'wiredfurni.params.clock_control.1' },
    { value: 2, label: 'wiredfurni.params.clock_control.2' },
    { value: 3, label: 'wiredfurni.params.clock_control.3' },
    { value: 4, label: 'wiredfurni.params.clock_control.4' }
];

const normalizeControl = (value: number) => {
    if (value < 0 || value > 4) return 0;

    return value;
};

export const WiredActionControlClockView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [control, setControl] = useState(0);
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    // Official layout: [action]; the furni source is the official source slot.
    const save = () => {
        setIntParams([control]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        if (!trigger) return;

        setControl(trigger.intData.length > 0 ? normalizeControl(trigger.intData[0]) : 0);
        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.clock_control')}</Text>
                {CONTROL_OPTIONS.map((option) => {
                    return (
                        <div key={option.value} className="flex items-center gap-1">
                            <Radio checked={control === option.value} id={`controlClock${option.value}`} name="controlClock" onCheckedChange={() => setControl(option.value)} />
                            <Text>{LocalizeText(option.label)}</Text>
                        </div>
                    );
                })}
            </div>
        </WiredActionBaseView>
    );
};
