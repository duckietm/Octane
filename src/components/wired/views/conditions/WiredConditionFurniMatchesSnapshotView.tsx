import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Checkbox } from '../../../../common/Checkbox';

interface WiredConditionFurniMatchesSnapshotViewProps {
    negative?: boolean;
}

export const WiredConditionFurniMatchesSnapshotView: FC<WiredConditionFurniMatchesSnapshotViewProps> = ({ negative = false }) => {
    const [stateFlag, setStateFlag] = useState(0);
    const [directionFlag, setDirectionFlag] = useState(0);
    const [positionFlag, setPositionFlag] = useState(0);
    const [altitudeFlag, setAltitudeFlag] = useState(0);
    const [quantifier, setQuantifier] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.intData?.length > 4) return trigger.intData[4];
        if (trigger?.intData?.length > 3) return trigger.intData[3];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });

    const save = () => setIntParams([stateFlag, directionFlag, positionFlag, altitudeFlag, furniSource, quantifier]);

    useEffect(() => {
        setStateFlag(trigger.getBoolean(0) ? 1 : 0);
        setDirectionFlag(trigger.getBoolean(1) ? 1 : 0);
        setPositionFlag(trigger.getBoolean(2) ? 1 : 0);
        setAltitudeFlag(trigger.intData.length > 4 && trigger.getBoolean(3) ? 1 : 0);
        if (trigger.intData.length > 4) setFurniSource(trigger.intData[4]);
        else if (trigger.intData.length > 3) setFurniSource(trigger.intData[3]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);
        setQuantifier(trigger.intData.length > 5 && trigger.intData[5] === 1 ? 1 : 0);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                        {[0, 1].map((value) => {
                            return (
                                <label key={value} className="flex items-center gap-1">
                                    <input
                                        checked={quantifier === value}
                                        className="form-check-input"
                                        name="snapshotQuantifier"
                                        type="radio"
                                        onChange={() => setQuantifier(value)}
                                    />
                                    <Text>{LocalizeText(`wiredfurni.params.quantifier.furni${negative ? '.neg' : ''}.${value}`)}</Text>
                                </label>
                            );
                        })}
                    </div>
                    <WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />
                </div>
            }
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.conditions')}</Text>
                <div className="flex items-center gap-1">
                    <Checkbox checked={!!stateFlag} id="stateFlag" onCheckedChange={(nextChecked) => setStateFlag(nextChecked ? 1 : 0)} />
                    <Text>{LocalizeText('wiredfurni.params.condition.state')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Checkbox checked={!!directionFlag} id="directionFlag" onCheckedChange={(nextChecked) => setDirectionFlag(nextChecked ? 1 : 0)} />
                    <Text>{LocalizeText('wiredfurni.params.condition.direction')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Checkbox checked={!!positionFlag} id="positionFlag" onCheckedChange={(nextChecked) => setPositionFlag(nextChecked ? 1 : 0)} />
                    <Text>{LocalizeText('wiredfurni.params.condition.position')}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Checkbox checked={!!altitudeFlag} id="altitudeFlag" onCheckedChange={(nextChecked) => setAltitudeFlag(nextChecked ? 1 : 0)} />
                    <Text>{LocalizeText('wiredfurni.params.condition.altitude')}</Text>
                </div>
            </div>
        </WiredConditionBaseView>
    );
};
