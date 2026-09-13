import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

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
    const [spacing, setSpacing] = useState(-1);
    const [movement, setMovement] = useState(-1);
    const { trigger = null, setIntParams = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.intData?.length > 2) return trigger.intData[2];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });

    const save = () => setIntParams([movement, spacing, furniSource]);

    useEffect(() => {
        if (trigger.intData.length >= 2) {
            setSpacing(trigger.intData[1]);
            setMovement(trigger.intData[0]);
        } else {
            setSpacing(-1);
            setMovement(-1);
        }

        if (trigger.intData.length > 2) setFurniSource(trigger.intData[2]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);
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
            <WiredSliderSection
                max={5}
                min={1}
                titleFallback={`Empty tiles: ${spacing}`}
                titleKey="wiredfurni.params.emptytiles"
                titleParameters={['tiles']}
                titleReplacements={[spacing.toString()]}
                value={spacing}
                onChange={setSpacing}
            />
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.movefurni', LocalizeText('wiredfurni.params.startdir'))}</Text>
                <div className="flex gap-1">
                    {directionOptions.map((value) => {
                        return (
                            <div key={value.value} className="flex items-center gap-1">
                                <input
                                    checked={movement === value.value}
                                    className="form-check-input"
                                    id={`movement${value.value}`}
                                    name="movement"
                                    type="radio"
                                    onChange={(event) => setMovement(value.value)}
                                />
                                <Text>
                                    <i className={`icon icon-${value.icon}`} />
                                </Text>
                            </div>
                        );
                    })}
                </div>
            </div>
        </WiredActionBaseView>
    );
};
