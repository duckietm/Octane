import { KeyboardEvent, ReactNode, useEffect, useId, useRef, useState } from 'react';
import arrowImage from '../../assets/images/habbo-skin/slices/dropmenu-arrow.png';

export interface UbuntuDropmenuOption<T>
{
    value: T;
    label: string;
}

export interface UbuntuDropmenuViewProps<T>
{
    /** Accessible name; AIR draws the selected caption only. */
    label: string;
    value: T;
    options: readonly UbuntuDropmenuOption<T>[];
    onSelect: (value: T) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * AIR dropmenu style 3 (habbo_skin_dropmenu_3_xml): the dropmenu_frame_3 field with its 22x20 arrow cell 2px from the
 * right edge, and an open list of dropmenu_item_3 rows, 23px each (a 17px u_regular line inside margins 4/2/4/4).
 */
export const UbuntuDropmenuView = <T extends string | number>({ label, value, options, onSelect, disabled = false, className = '' }: UbuntuDropmenuViewProps<T>): ReactNode =>
{
    const id = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const [ open, setOpen ] = useState(false);
    const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
    const [ active, setActive ] = useState(selectedIndex);

    useEffect(() =>
    {
        if(!open) return;

        const close = (event: MouseEvent) =>
        {
            if(rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
        };

        document.addEventListener('mousedown', close);

        return () => document.removeEventListener('mousedown', close);
    }, [ open ]);

    useEffect(() =>
    {
        if(disabled) setOpen(false);
    }, [ disabled ]);

    const toggle = () =>
    {
        if(disabled) return;

        setActive(selectedIndex);
        setOpen(current => !current);
    };

    const choose = (index: number) =>
    {
        const option = options[index];

        setOpen(false);

        if(option && option.value !== value) onSelect(option.value);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) =>
    {
        if(disabled) return;

        if(event.key === 'Escape') { setOpen(false); return; }
        if(event.key === 'ArrowDown' || event.key === 'ArrowUp')
        {
            event.preventDefault();

            if(!open) { setActive(selectedIndex); setOpen(true); return; }

            setActive(index => Math.min(options.length - 1, Math.max(0, index + (event.key === 'ArrowDown' ? 1 : -1))));
            return;
        }
        if((event.key === 'Enter' || event.key === ' ') && open)
        {
            event.preventDefault();
            choose(active);
        }
    };

    return (
        <div ref={ rootRef } className={ `ubuntu-dropmenu ${ className }`.trim() }>
            <button type="button" role="combobox" className="ubuntu-dropmenu__field" aria-label={ label } aria-expanded={ open } aria-controls={ `${ id }-list` } disabled={ disabled } onClick={ toggle } onKeyDown={ onKeyDown }>
                <span className="ubuntu-dropmenu__caption">{ options[selectedIndex]?.label ?? '' }</span>
                <img className="ubuntu-dropmenu__arrow" src={ arrowImage } alt="" />
            </button>
            { open &&
                <ul id={ `${ id }-list` } role="listbox" aria-label={ label } className="ubuntu-dropmenu__list">
                    { options.map((option, index) =>
                        <li key={ String(option.value) } role="option" aria-selected={ index === selectedIndex }
                            className={ `ubuntu-dropmenu__item${ index === active ? ' is-active' : '' }${ index === selectedIndex ? ' is-selected' : '' }` }
                            onMouseEnter={ () => setActive(index) } onMouseDown={ event => event.preventDefault() } onClick={ () => choose(index) }>
                            <span>{ option.label }</span>
                        </li>) }
                </ul> }
        </div>
    );
};
