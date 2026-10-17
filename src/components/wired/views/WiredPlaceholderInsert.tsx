import { Triggerable } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { Select } from '../../../common/Select';

/** The official text-placeholder context of a message box (wired context type 7). */
const TEXT_PLACEHOLDERS_CONTEXT = 7;

/** The placeholder names the server offers this box: the stack's text outputs, and trigger_text on a keyword stack. */
export const getWiredPlaceholderNames = (trigger: Triggerable): string[] => {
    const contexts = trigger?.contexts ?? [];

    for (const context of contexts) {
        if (context.type === TEXT_PLACEHOLDERS_CONTEXT) return context.placeholderNames ?? [];
    }

    return [];
};

interface WiredPlaceholderInsertProps {
    trigger: Triggerable;
    /** Called with the token to insert, `$(name)`. */
    onInsert: (token: string) => void;
}

/** Official message editor "Add placeholder": a list of the stack's placeholders, off when there are none. */
export const WiredPlaceholderInsert: FC<WiredPlaceholderInsertProps> = ({ trigger, onInsert }) => {
    const names = getWiredPlaceholderNames(trigger);

    return (
        <Select
            aria-label="add placeholder"
            className="form-select form-select-sm"
            disabled={!names.length}
            value=""
            onChange={(event) => {
                if (event.target.value) onInsert(`$(${event.target.value})`);
            }}
        >
            <option value="">{localizeWithFallback('wiredfurni.params.message_editor.add_placeholder', 'Add placeholder')}</option>
            {names.map((name) => (
                <option key={name} value={name}>
                    {name}
                </option>
            ))}
        </Select>
    );
};
