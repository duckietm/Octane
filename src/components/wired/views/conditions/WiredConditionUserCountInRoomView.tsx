import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionUserCountInRoomView: FC<{}> = (props) => {
    const [min, setMin] = useState(1);
    const [max, setMax] = useState(0);
    // Official layout: [min, max], the users in the official source slot.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    const save = () => {
        setIntParams([min, max]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        if (trigger.intData.length >= 2) {
            setMin(trigger.intData[0]);
            setMax(trigger.intData[1]);
        } else {
            setMin(1);
            setMax(0);
        }
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.usercountmin', ['value'], [min.toString()])}</Text>
                    <Slider max={125} min={0} value={min} onChange={(event) => setMin(event)} />
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.usercountmax', ['value'], [max.toString()])}</Text>
                    <Slider max={125} min={0} value={max} onChange={(event) => setMax(event)} />
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
