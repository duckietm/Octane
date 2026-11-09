import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_PICK_AMOUNT = 1;
const MIN_SKIP_EXECUTIONS = 0;
/** AIR's sliders: picks 1..100, skips 0..100. */
const MAX_RANDOM_VALUE = 100;

const clampSlider = (value: number, min: number) => {
    if (isNaN(value)) return min;

    return Math.max(min, Math.min(MAX_RANDOM_VALUE, Math.floor(value)));
};

const normalizePickAmount = (value: number) => clampSlider(value, MIN_PICK_AMOUNT);
const normalizeSkipExecutions = (value: number) => clampSlider(value, MIN_SKIP_EXECUTIONS);

/**
 * AIR's random add-on (class_4185): a picks slider, then a skips slider (leave out what the last N firings picked),
 * neither with a number input; the value shows in the title. Ints `[skips, picks]`.
 */
export const WiredExtraRandomView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [pickAmount, setPickAmount] = useState(MIN_PICK_AMOUNT);
    const [skipExecutions, setSkipExecutions] = useState(MIN_SKIP_EXECUTIONS);

    useEffect(() => {
        if (!trigger) return;

        const d = trigger.intData;

        setSkipExecutions(normalizeSkipExecutions(d[0] ?? MIN_SKIP_EXECUTIONS));
        setPickAmount(normalizePickAmount(d[1] ?? MIN_PICK_AMOUNT));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeSkipExecutions(skipExecutions), normalizePickAmount(pickAmount)]);
        setStringParam('');
    };

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
                <div className="flex flex-col gap-2">
                    <WiredSliderSection
                        max={MAX_RANDOM_VALUE}
                        min={MIN_PICK_AMOUNT}
                        numberInput={false}
                        title={LocalizeText('wiredfurni.params.pickamount', ['picks'], [pickAmount.toString()])}
                        value={pickAmount}
                        onChange={(value) => setPickAmount(normalizePickAmount(value))}
                    />
                    <WiredSliderSection
                        max={MAX_RANDOM_VALUE}
                        min={MIN_SKIP_EXECUTIONS}
                        numberInput={false}
                        title={LocalizeText('wiredfurni.params.skipactions', ['skips'], [skipExecutions.toString()])}
                        value={skipExecutions}
                        onChange={(value) => setSkipExecutions(normalizeSkipExecutions(value))}
                    />
                </div>
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
