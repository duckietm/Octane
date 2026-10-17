import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredSliderSection } from '../WiredSliderSection';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

const directionOptions: { value: number; icon: string }[] = [
    {
        value: 0,
        icon: 'ne'
    },
    {
        value: 2,
        icon: 'se'
    },
    {
        value: 4,
        icon: 'sw'
    },
    {
        value: 6,
        icon: 'nw'
    }
];

export const WiredActionMoveFurniToView: FC<{}> = (props) => {
    const [spacing, setSpacing] = useState(1);
    const [movement, setMovement] = useState(0);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    // Official layout: [direction (0 by default), empty tiles (1 by default)]; the furni source is the
    // official slot.
    const save = () => {
        setIntParams([movement, spacing]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        setMovement(trigger?.intData?.[0] ?? 0);
        setSpacing(Math.max(1, trigger?.intData?.[1] ?? 1));
        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.movefurni', LocalizeText('wiredfurni.params.startdir'))}</Text>
                <div className="flex flex-col gap-1">
                    {directionOptions.map((value) => (
                        <label key={value.value} className="flex items-center gap-1">
                            <Radio checked={movement === value.value} name="movement" onCheckedChange={() => setMovement(value.value)} />
                            <i className={`icon icon-${value.icon}`} />
                            <Text>{localizeWithFallback(`wiredfurni.params.movefurni.${value.value}`, value.icon.toUpperCase())}</Text>
                        </label>
                    ))}
                </div>
            </div>
            <WiredSliderSection
                max={5}
                min={1}
                title={LocalizeText('wiredfurni.params.emptytiles', ['tiles'], [spacing.toString()])}
                value={spacing}
                onChange={setSpacing}
            />
        </WiredActionBaseView>
    );
};
