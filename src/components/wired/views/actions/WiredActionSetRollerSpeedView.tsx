import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

export const WiredActionSetRollerSpeedView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null } = useWired();
    const [speed, setSpeed] = useState<number>(() => ((trigger?.intData?.length ?? 0) > 0 ? trigger.intData[0] : 2));

    useEffect(() => {
        if (!trigger) return;

        setSpeed((trigger.intData?.length ?? 0) > 0 ? trigger.intData[0] : 2);
    }, [trigger]);

    const save = () => setIntParams([speed]);

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.roller_speed', 'Roller speed')}</Text>
                <Text small>{localizeWithFallback('wiredfurni.params.roller_speed.info', '-1 = rollers off, 0 = fastest, higher = slower (max 10)')}</Text>
                <input
                    className="form-control form-control-sm"
                    type="number"
                    min={-1}
                    max={10}
                    value={speed}
                    onChange={(event) => setSpeed(parseInt(event.target.value, 10) || 0)}
                />
            </div>
        </WiredActionBaseView>
    );
};
