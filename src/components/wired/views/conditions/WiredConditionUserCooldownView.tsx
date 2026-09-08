import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const MIN_SECONDS = 1;
const MAX_SECONDS = 7 * 24 * 3600;

const clampSeconds = (value: number) => (Number.isNaN(value) ? MIN_SECONDS : Math.max(MIN_SECONDS, Math.min(MAX_SECONDS, Math.floor(value))));

// Server contract (WiredConditionUserCooldown): intData = [seconds]. The user who triggers passes, and
// then not again until the seconds have gone by; the memory is per user and per box.
export const WiredConditionUserCooldownView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [seconds, setSeconds] = useState(MIN_SECONDS);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setSeconds(data.length > 0 ? clampSeconds(data[0]) : MIN_SECONDS);
    }, [trigger]);

    const save = () => setIntParams([clampSeconds(seconds)]);

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.cooldown_seconds', 'Seconds before the same user can trigger again')}</Text>
                <input
                    type="number"
                    min={MIN_SECONDS}
                    max={MAX_SECONDS}
                    className="form-control form-control-sm"
                    style={{ maxWidth: 140 }}
                    value={seconds}
                    onChange={(event) => setSeconds(clampSeconds(parseInt(event.target.value, 10)))}
                />
            </div>
        </WiredConditionBaseView>
    );
};
