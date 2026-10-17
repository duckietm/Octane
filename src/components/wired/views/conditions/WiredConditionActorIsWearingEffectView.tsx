import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';

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
    // Official layout: [effect (0 any), our quantifier], the users in the official source slot.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    const save = () => {
        setIntParams([effect, quantifier]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setEffect(trigger?.intData[0] ?? 0);
        setUserSource(trigger?.userSourceTypes?.[0] ?? 0);
        setQuantifier(trigger?.intData?.[1] === 1 ? 1 : 0);
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
                        <Radio checked={quantifier === value} name="effectQuantifier" onCheckedChange={() => setQuantifier(value)} />
                        <Text>{LocalizeText(`wiredfurni.params.quantifier.users${negative ? '.neg' : ''}.${value}`)}</Text>
                    </label>
                ))}
            </div>
            {showEffect && (
                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.effectid', LocalizeText('wiredfurni.tooltip.effectid'))}</Text>
                    <OctaneInput type="number" value={effect} onChange={(event) => setEffect(parseInt(event.target.value))} />
                </div>
            )}
        </WiredConditionBaseView>
    );
};
