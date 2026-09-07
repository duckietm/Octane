import { FC, useEffect, useRef, useState } from 'react';
import { LocalizeText, SearchFilterOptions } from '../../../../api';
import dropmenuArrow from '../../../../assets/images/habbo-skin/slices/dropmenu-arrow.png';

interface NavigatorFilterChipsViewProps {
    value: number;
    onChange: (index: number) => void;
}

export const NavigatorFilterChipsView: FC<NavigatorFilterChipsViewProps> = (props) => {
    const { value, onChange } = props;
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const current = SearchFilterOptions[value] ?? SearchFilterOptions[0];

    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <div ref={rootRef} className={`octane-navigator-air__filter${open ? ' is-open' : ''}`}>
            <button
                type="button"
                className="octane-navigator-air__filter-button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={LocalizeText('navigator.filter.anything')}
                onClick={() => setOpen((currentOpen) => !currentOpen)}
            >
                <span>{LocalizeText('navigator.filter.' + current.name)}</span>
                <img src={dropmenuArrow} alt="" width={22} height={20} />
            </button>
            {open && (
                <ul className="octane-navigator-air__filter-list" role="listbox">
                    {SearchFilterOptions.map((filter, index) => (
                        <li key={filter.name}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={index === value}
                                className={index === value ? 'is-selected' : undefined}
                                onClick={() => {
                                    onChange(index);
                                    setOpen(false);
                                }}
                            >
                                {LocalizeText('navigator.filter.' + filter.name)}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
