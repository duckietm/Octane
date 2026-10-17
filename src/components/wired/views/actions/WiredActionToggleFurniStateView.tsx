import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

export const WiredActionToggleFurniStateView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [toggleType, setToggleType] = useState<number>(() => trigger?.intData?.[0] ?? 0);
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    useEffect(() => {
        if (!trigger) return;

        // Official layout: [toggle type]; the furni source is the official source slot.
        setToggleType(trigger.intData?.[0] ?? 0);
        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([toggleType]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.toggletype_selection', LocalizeText('wiredfurni.params.operator.2'))}</Text>
                {[0, 1].map((option) => (
                    <label key={option} className="flex items-center gap-1">
                        <Radio checked={toggleType === option} name="toggleType" onCheckedChange={() => setToggleType(option)} />
                        <Text>{LocalizeText(`wiredfurni.params.toggletype.${option}`)}</Text>
                    </label>
                ))}
            </div>
        </WiredActionBaseView>
    );
};
