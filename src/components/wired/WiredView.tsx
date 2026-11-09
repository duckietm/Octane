import { ConditionDefinition, TriggerDefinition, WiredActionDefinition, WiredAddonDefinition, WiredSelectorDefinition, WiredVariableDefinition } from '@octane/renderer';
import { FC, Fragment } from 'react';
import { useWired } from '../../hooks';
import { WiredActionLayoutView } from './views/actions/WiredActionLayoutView';
import { WiredConditionLayoutView } from './views/conditions/WiredConditionLayoutView';
import { WiredAddonLayoutView } from './views/extras/WiredAddonLayoutView';
import { WiredVariableLayoutView } from './views/extras/WiredVariableLayoutView';
import { WiredSelectorLayoutView } from './views/selectors/WiredSelectorLayoutView';
import { WiredTriggerLayoutView } from './views/triggers/WiredTriggerLayoutView';

export const WiredView: FC<{}> = (props) => {
    const { trigger = null } = useWired();

    if (!trigger) return null;

    // Selectors have their own official code space (0..19, ours from 1000).
    if (trigger instanceof WiredSelectorDefinition) {
        return <Fragment key={`wired-selector-${trigger.id}-${trigger.code}`}>{WiredSelectorLayoutView(trigger.code)}</Fragment>;
    }

    // Addons (0..22, 1000.., 1200.., 2000.., ours from 3000) and variables (0..9) likewise.
    if (trigger instanceof WiredAddonDefinition) {
        return <Fragment key={`wired-addon-${trigger.id}-${trigger.code}`}>{WiredAddonLayoutView(trigger.code)}</Fragment>;
    }

    if (trigger instanceof WiredVariableDefinition) {
        return <Fragment key={`wired-variable-${trigger.id}-${trigger.code}`}>{WiredVariableLayoutView(trigger.code)}</Fragment>;
    }

    if (trigger instanceof WiredActionDefinition) {
        return <Fragment key={`wired-action-${trigger.id}-${trigger.code}`}>{WiredActionLayoutView(trigger.code)}</Fragment>;
    }

    if (trigger instanceof TriggerDefinition) {
        return <Fragment key={`wired-trigger-${trigger.id}-${trigger.code}`}>{WiredTriggerLayoutView(trigger.code)}</Fragment>;
    }

    if (trigger instanceof ConditionDefinition) {
        return <Fragment key={`wired-condition-${trigger.id}-${trigger.code}`}>{WiredConditionLayoutView(trigger.code)}</Fragment>;
    }

    return null;
};
