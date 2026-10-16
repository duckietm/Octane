import { FC } from 'react';
import {
    localizeWithFallback,
    WIRED_USER_ACTION_DANCE,
    WIRED_USER_ACTION_DANCES,
    WIRED_USER_ACTION_SIGN,
    WIRED_USER_ACTION_SIGNS,
    WIRED_USER_ACTIONS,
    WiredUserActionChoice
} from '../../../api';
import { Text } from '../../../common';
import { Checkbox } from '../../../common/Checkbox';

/**
 * The official action picker of the "user performs action" boxes: section action_selection, and for
 * sign / dance a section with the filter checkbox and its dropdown next to it.
 */
export const WiredUserActionSection: FC<{ choice: WiredUserActionChoice; onChange: (choice: WiredUserActionChoice) => void }> = ({ choice, onChange }) =>
{
    const patch = (next: Partial<WiredUserActionChoice>) => onChange({ ...choice, ...next });

    const extraSection = (titleKey: string, filterKey: string, tooltipKey: string, enabled: boolean, value: number, values: number[], labelKey: (value: number) => string, onToggle: (on: boolean) => void, onSelect: (value: number) => void) => (
        <div className="flex flex-col gap-1">
            <Text bold>{ localizeWithFallback(titleKey, '') }</Text>
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-1">
                    <Checkbox checked={ enabled } onCheckedChange={(nextChecked) => onToggle(nextChecked)} />
                    <Text>{ localizeWithFallback(filterKey, '') }</Text>
                </label>
                <select className="form-select form-select-sm" title={ localizeWithFallback(tooltipKey, '') } value={ value } onChange={ event => onSelect(parseInt(event.target.value, 10)) }>
                    { values.map(entry => <option key={ entry } value={ entry }>{ localizeWithFallback(labelKey(entry), String(entry)) }</option>) }
                </select>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
                <Text bold>{ localizeWithFallback('wiredfurni.params.action_selection', 'Action') }</Text>
                <select className="form-select form-select-sm" title={ localizeWithFallback('wiredfurni.tooltip.action', '') } value={ choice.action } onChange={ event => patch({ action: parseInt(event.target.value, 10) }) }>
                    { WIRED_USER_ACTIONS.map(action => <option key={ action.code } value={ action.code }>{ localizeWithFallback(`wiredfurni.params.action.${ action.code }`, action.name) }</option>) }
                </select>
            </div>
            { choice.action === WIRED_USER_ACTION_SIGN && extraSection(
                'wiredfurni.params.sign_selection', 'wiredfurni.params.sign_filter', 'wiredfurni.tooltip.sign',
                choice.signFilter, choice.signId, WIRED_USER_ACTION_SIGNS, value => `wiredfurni.params.action.sign.${ value }`,
                on => patch({ signFilter: on }), value => patch({ signId: value })) }
            { choice.action === WIRED_USER_ACTION_DANCE && extraSection(
                'wiredfurni.params.dance_selection', 'wiredfurni.params.dance_filter', 'wiredfurni.tooltip.dance',
                choice.danceFilter, choice.danceId, WIRED_USER_ACTION_DANCES, value => `wiredfurni.params.action.dance.${ value }`,
                on => patch({ danceFilter: on }), value => patch({ danceId: value })) }
        </div>
    );
};
