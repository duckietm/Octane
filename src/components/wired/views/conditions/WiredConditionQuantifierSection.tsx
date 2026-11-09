import { FC } from 'react';
import { hasWiredQuantifier, LocalizeText, resolveWiredQuantifier, WIRED_QUANTIFIER_ALL, WIRED_QUANTIFIER_ANY, wiredQuantifierLabelKey } from '../../../../api';
import { Text } from '../../../../common';
import { Radio } from '../../../../common/Radio';
import { useWired } from '../../../../hooks';

/**
 * The official condition quantifier section (UserDefinedRoomEventsCtrl.createAdvancedSections): a two-option radio
 * under `wiredfurni.params.quantifier_selection`, labelled from the definition's quantifierType and isInvert. It
 * edits the quantifier the save packet sends in its own slot; a condition without a quantifier draws nothing.
 */
export const WiredConditionQuantifierSection: FC = () => {
    const { trigger = null, quantifierCode = null, setQuantifierCode = null } = useWired();
    const quantifierType = trigger?.quantifierType ?? 0;

    if (!trigger || !hasWiredQuantifier(quantifierType)) return null;

    const selected = resolveWiredQuantifier(quantifierCode, trigger.quantifierCode);

    return (
        <div className="flex flex-col gap-1">
            <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
            {[WIRED_QUANTIFIER_ALL, WIRED_QUANTIFIER_ANY].map((value) => (
                <label key={value} className="flex items-center gap-1">
                    <Radio checked={selected === value} name="wiredConditionQuantifier" onCheckedChange={() => setQuantifierCode(value)} />
                    <Text>{LocalizeText(wiredQuantifierLabelKey(quantifierType, !!trigger.isInvert, value))}</Text>
                </label>
            ))}
        </div>
    );
};
