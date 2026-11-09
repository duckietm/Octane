import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSliderSection } from '../WiredSliderSection';
import { WiredExtraBaseView } from './WiredExtraBaseView';

const MIN_DURATION = 50;
const MAX_DURATION = 2000;
const STEP_DURATION = 50;
const DEFAULT_DURATION = MIN_DURATION;

const normalizeDuration = (value: number) => {
    if (isNaN(value)) return DEFAULT_DURATION;

    return Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(value / STEP_DURATION) * STEP_DURATION));
};

export const WiredExtraAnimationTimeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [duration, setDuration] = useState(DEFAULT_DURATION);

    useEffect(() => {
        if (!trigger) return;

        setDuration(normalizeDuration(trigger.intData.length > 0 ? trigger.intData[0] : DEFAULT_DURATION));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeDuration(duration)]);
        setStringParam('');
    };

    return (
        <NativeTextTree>
            <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
                {/* Official: the setanimationtime2 slider section, with the header number input. */}
                <WiredSliderSection
                    max={MAX_DURATION}
                    min={MIN_DURATION}
                    step={STEP_DURATION}
                    displayStep={STEP_DURATION}
                    title={localizeWithFallback('wiredfurni.params.setanimationtime2', 'Animation time (ms):')}
                    value={duration}
                    onChange={(value) => setDuration(normalizeDuration(value))}
                />
            </WiredExtraBaseView>
        </NativeTextTree>
    );
};
