import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

/** Official NumberInputParam(0, int32 min, int32 max): out of range clamps, anything else is 0. */
export const clampEffectId = (value: number) => (Number.isFinite(value) ? Math.max(INT32_MIN, Math.min(INT32_MAX, Math.trunc(value))) : 0);

interface WiredConditionActorIsWearingEffectViewProps {
    /**
     * The freeze conditions share this dialog for its user source, but they ask
     * WiredFreezeUtil whether someone is frozen — there is no effect to name. They pass false, and the
     * effect-id box stays out of the window.
     */
    showEffect?: boolean;
}

export const WiredConditionActorIsWearingEffectView: FC<WiredConditionActorIsWearingEffectViewProps> = ({ showEffect = true }) => {
    const [effect, setEffect] = useState(0);
    // Official layout: [effect (0 any)], the users in the official source slot; the quantifier is the base view's.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    const save = () => {
        setIntParams([effect]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setEffect(clampEffectId(trigger?.intData?.[0] ?? 0));
        setUserSource(trigger?.userSourceTypes?.[0] ?? 0);
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                {showEffect && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.effectid', LocalizeText('wiredfurni.tooltip.effectid'))}</Text>
                        <OctaneInput
                            max={INT32_MAX}
                            min={INT32_MIN}
                            title={LocalizeText('wiredfurni.tooltip.effectid')}
                            type="number"
                            value={effect}
                            onChange={(event) => setEffect(clampEffectId(parseInt(event.target.value)))}
                        />
                    </div>
                )}
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
