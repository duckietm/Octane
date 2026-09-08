import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { normalizeWiredComparison, WIRED_CMP_EQUAL, WiredComparisonOperator } from '../WiredComparisonOperator';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const MIN_OPACITY = 0;
const MAX_OPACITY = 100;
const SOURCE_SELECTED = 100;

const clampOpacity = (value: number) => (Number.isNaN(value) ? MAX_OPACITY : Math.max(MIN_OPACITY, Math.min(MAX_OPACITY, Math.floor(value))));

// Server contract (WiredConditionFurniOpacityIs): intData = [opacity, comparison, furniSource] plus the
// picked furni. Every resolved furni has to compare as asked; the negative box passes when none does.
export const WiredConditionFurniOpacityView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [opacity, setOpacity] = useState(MAX_OPACITY);
    const [comparison, setComparison] = useState(WIRED_CMP_EQUAL);
    const [furniSource, setFurniSource] = useState(SOURCE_SELECTED);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setOpacity(data.length > 0 ? clampOpacity(data[0]) : MAX_OPACITY);
        setComparison(data.length > 1 ? normalizeWiredComparison(data[1]) : WIRED_CMP_EQUAL);
        setFurniSource(data.length > 2 ? data[2] : SOURCE_SELECTED);
    }, [trigger]);

    const save = () => setIntParams([clampOpacity(opacity), comparison, furniSource]);

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    <Text bold>
                        {localizeWithFallback('wiredfurni.params.opacity', 'Opacity')}: {opacity}%
                    </Text>
                    <Slider max={MAX_OPACITY} min={MIN_OPACITY} value={opacity} onChange={(value) => setOpacity(value)} />
                </div>
                <WiredComparisonOperator name="wiredFurniOpacityComparison" value={comparison} onChange={setComparison} />
            </div>
        </WiredConditionBaseView>
    );
};
