import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { NitroInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionActorIsWearingEffectViewProps {
    negative?: boolean;
    /**
     * The freeze conditions share this dialog for its user source and quantifier, but they ask
     * WiredFreezeUtil whether someone is frozen — there is no effect to name. They pass false, and the
     * effect-id box stays out of the window.
     */
    showEffect?: boolean;
}

export const WiredConditionActorIsWearingEffectView: FC<WiredConditionActorIsWearingEffectViewProps> = ({ negative = false, showEffect = true }) => {
    const [effect, setEffect] = useState(-1);
    const [quantifier, setQuantifier] = useState(1);
    const { trigger = null, setIntParams = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });

    const save = () => setIntParams([effect, userSource, quantifier]);

    useEffect(() => {
        setEffect(trigger?.intData[0] ?? 0);
        if (trigger?.intData?.length > 1) setUserSource(trigger.intData[1]);
        else setUserSource(0);
        setQuantifier(trigger?.intData?.length > 2 ? (trigger.intData[2] === 1 ? 1 : 0) : 1);
    }, [trigger]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                {[0, 1].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <input
                            checked={quantifier === value}
                            className="form-check-input"
                            name="effectQuantifier"
                            type="radio"
                            onChange={() => setQuantifier(value)}
                        />
                        <Text>{LocalizeText(`wiredfurni.params.quantifier.users${negative ? '.neg' : ''}.${value}`)}</Text>
                    </label>
                ))}
            </div>
            {showEffect && (
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.effectid', LocalizeText('wiredfurni.tooltip.effectid'))}</Text>
                    <NitroInput type="number" value={effect} onChange={(event) => setEffect(parseInt(event.target.value))} />
                </div>
            )}
        </WiredConditionBaseView>
    );
};
