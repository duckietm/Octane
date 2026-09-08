import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const POINTS_TYPE_OPTIONS = [
    { value: 0, key: 'wiredfurni.params.points_type.0', label: 'Pixels / Duckets' },
    { value: 5, key: 'wiredfurni.params.points_type.5', label: 'Diamonds' },
    { value: 101, key: 'wiredfurni.params.points_type.101', label: 'Seasonal' },
    { value: 103, key: 'wiredfurni.params.points_type.103', label: 'GotW Points' },
    { value: 104, key: 'wiredfurni.params.points_type.104', label: 'Soft Currency' }
];

export const WiredActionGivePointsTypeView: FC<{}> = (props) => {
    const { trigger = null, setIntParams = null } = useWired();
    const [pointsType, setPointsType] = useState<number>(0);
    const [amount, setAmount] = useState<number>(1);
    const [userSource, setUserSource] = useState<number>(0);

    useEffect(() => {
        if (!trigger) return;

        setPointsType((trigger.intData?.length ?? 0) > 0 ? trigger.intData[0] : 0);
        setAmount((trigger.intData?.length ?? 0) > 1 ? trigger.intData[1] : 1);
        setUserSource((trigger.intData?.length ?? 0) > 2 ? trigger.intData[2] : 0);
    }, [trigger]);

    const save = () => setIntParams([pointsType, amount, userSource]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.choose_type')}</Text>
                <select className="form-select form-select-sm" value={pointsType} onChange={(event) => setPointsType(parseInt(event.target.value, 10) || 0)}>
                    {POINTS_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {localizeWithFallback(option.key, option.label)}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.setpoints', ['points'], [amount.toString()])}</Text>
                <input
                    className="form-control form-control-sm"
                    type="number"
                    min={1}
                    max={1000}
                    value={amount}
                    onChange={(event) => setAmount(parseInt(event.target.value, 10) || 0)}
                />
            </div>
        </WiredActionBaseView>
    );
};
