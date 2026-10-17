import { FC, useRef, useState } from 'react';
import { LocalizeText, SearchFilterOptions } from '../../../../api';
import dropmenuArrow from '../../../../assets/images/habbo-skin/slices/dropmenu-default-arrow.png';
import { ListSelect } from '../../../../common/ListSelect';

interface NavigatorFilterChipsViewProps {
    value: number;
    onChange: (index: number) => void;
}

export const NavigatorFilterChipsView: FC<NavigatorFilterChipsViewProps> = (props) => {
    const { value, onChange } = props;
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = SearchFilterOptions[value] ? value : 0;

    return (
        <div ref={rootRef} className={`octane-navigator-air__filter${open ? ' is-open' : ''}`}>
            <ListSelect
                aria-label={LocalizeText('navigator.filter.anything')}
                container={rootRef}
                itemClassName="octane-navigator-air__filter-option"
                options={SearchFilterOptions.map((filter, index) => ({ value: String(index), label: LocalizeText('navigator.filter.' + filter.name) }))}
                popupClassName="octane-navigator-air__filter-list"
                sideOffset={-1}
                triggerClassName="octane-navigator-air__filter-button"
                value={String(selected)}
                renderTrigger={(current) => (
                    <>
                        <span>{current?.label}</span>
                        <img src={dropmenuArrow} alt="" width={16} height={16} />
                    </>
                )}
                onOpenChange={setOpen}
                onValueChange={(next) => onChange(Number(next))}
            />
        </div>
    );
};
