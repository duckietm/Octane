import { Autocomplete } from '@base-ui/react/autocomplete';
import { FC, useMemo, useState } from 'react';

export interface SuggestInputProps {
    value: string;
    options: readonly string[];
    /** Every keystroke and every picked suggestion; free text is allowed. */
    onChange: (value: string) => void;
    id?: string;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    'aria-label'?: string;
    /** Cap on the rows shown. */
    maxItems?: number;
}

/**
 * Text input with a suggestion list (Base UI Autocomplete) in place of a native `<datalist>`:
 * the typed text is kept as is, suggestions narrow by substring, Escape closes the list.
 */
export const SuggestInput: FC<SuggestInputProps> = ({ value, options, onChange, id, className, placeholder, disabled, maxItems = 12, ...rest }) => {
    const [open, setOpen] = useState(false);
    // An empty field only lists everything when the arrow key asks for it; typing alone needs text.
    const [forced, setForced] = useState(false);
    const needle = value.trim().toLowerCase();
    const items = useMemo(() => {
        const list = needle ? options.filter((option) => option.toLowerCase().includes(needle)) : [...options];
        return list.slice(0, maxItems);
    }, [options, needle, maxItems]);

    // What the user sees: Escape only belongs to the list while the list is actually showing.
    const listVisible = open && items.length > 0 && (needle.length > 0 || forced);

    return (
        <Autocomplete.Root
            disabled={disabled}
            filter={null}
            items={items}
            mode="list"
            open={listVisible}
            value={value}
            onOpenChange={(next) => {
                setOpen(next);
                if (!next) setForced(false);
            }}
            onValueChange={(next, details) => {
                onChange(next);
                setOpen(details.reason !== 'item-press');
                if (details.reason === 'item-press') setForced(false);
            }}
        >
            <Autocomplete.Input
                id={id}
                aria-label={rest['aria-label']}
                className={className}
                placeholder={placeholder}
                spellCheck={false}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' && !needle) {
                        setForced(true);
                        setOpen(true);
                    } else if (event.key === 'Escape' && listVisible) {
                        event.stopPropagation();
                        setOpen(false);
                        setForced(false);
                    }
                }}
            />
            <Autocomplete.Portal>
                <Autocomplete.Positioner align="start" className="octane-select-positioner" sideOffset={2}>
                    <Autocomplete.Popup className="w-[var(--anchor-width)] min-w-[8rem] max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-[#ffffff] shadow-lg text-[11px] py-0.5">
                        <Autocomplete.List>
                            {(option: string) => (
                                <Autocomplete.Item key={option} className="px-2 py-1 cursor-pointer text-slate-700 data-[highlighted]:bg-slate-100" value={option}>
                                    {option}
                                </Autocomplete.Item>
                            )}
                        </Autocomplete.List>
                    </Autocomplete.Popup>
                </Autocomplete.Positioner>
            </Autocomplete.Portal>
        </Autocomplete.Root>
    );
};
