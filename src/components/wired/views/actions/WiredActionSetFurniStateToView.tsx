import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';

export const WiredActionSetFurniStateToView: FC<{}> = (props) => {
    const [stateFlag, setStateFlag] = useState(0);
    const [directionFlag, setDirectionFlag] = useState(0);
    const [positionFlag, setPositionFlag] = useState(0);
    const [altitudeFlag, setAltitudeFlag] = useState(0);
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    // Official layout: [state, direction, position, altitude]; the furni source is the official slot.
    const save = () => {
        setIntParams([stateFlag, directionFlag, positionFlag, altitudeFlag]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    useEffect(() => {
        setStateFlag(trigger.getBoolean(0) ? 1 : 0);
        setDirectionFlag(trigger.getBoolean(1) ? 1 : 0);
        setPositionFlag(trigger.getBoolean(2) ? 1 : 0);
        setAltitudeFlag(trigger.getBoolean(3) ? 1 : 0);
        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
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
        </WiredActionBaseView>
    );
};
