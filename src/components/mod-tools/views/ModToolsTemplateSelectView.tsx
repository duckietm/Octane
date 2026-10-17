import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { Select } from '../../../common/Select';

interface ModToolsTemplateSelectViewProps {
    templates: string[];
    className?: string;
    onSelect: (template: string) => void;
}

// The "Select from message templates" drop-down of the classic moderation windows: the server
// sends the presets with ModeratorInit and picking one fills the message box.
export const ModToolsTemplateSelectView: FC<ModToolsTemplateSelectViewProps> = (props) => {
    const { templates = null, className = '', onSelect = null } = props;

    if (!templates || templates.length === 0) return null;

    const placeholder = localizeWithFallback('modtools.template.select', 'Select from message templates');

    return (
        <Select
            aria-label={placeholder}
            className={`form-select form-select-sm ${className}`}
            value=""
            onChange={(event) => {
                const template = templates[Number(event.target.value)];

                if (template) onSelect(template);
            }}
        >
            <option value="">{placeholder}</option>
            {templates.map((template, index) => (
                <option key={index} value={index}>
                    {template.length > 70 ? `${template.slice(0, 67)}...` : template}
                </option>
            ))}
        </Select>
    );
};
