import { FC } from 'react';
import { localizeWithFallback } from '../../../api';

interface ModToolsTemplateSelectProps {
    templates: string[];
    onSelect: (template: string) => void;
    className?: string;
}

/**
 * The "select from message templates" drop-down of the official send-message and room
 * tool windows. Picking an entry hands the template to the caller, which puts it in the
 * message box; the select itself snaps back to its placeholder so the same template can
 * be picked again after the moderator edits the text.
 */
export const ModToolsTemplateSelect: FC<ModToolsTemplateSelectProps> = (props) => {
    const { templates = [], onSelect = null, className = '' } = props;

    if (!templates || !templates.length) return null;

    return (
        <select
            aria-label={localizeWithFallback('modtools.message.templates.select', 'Select from message templates')}
            className={`form-select form-select-sm ${className}`.trim()}
            value=""
            onChange={(event) => {
                const index = parseInt(event.target.value, 10);
                const template = templates[index];

                if (template !== undefined && onSelect) onSelect(template);
            }}
        >
            <option value="">{localizeWithFallback('modtools.message.templates.select', 'Select from message templates')}</option>
            {templates.map((template, index) => (
                <option key={index} value={index}>
                    {template.length > 70 ? `${template.slice(0, 67)}...` : template}
                </option>
            ))}
        </select>
    );
};
