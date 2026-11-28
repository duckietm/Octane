import { FC, useRef, useState } from 'react';
import { LocalizeText, SearchFilterOptions } from '../../../../api';
import magnifierIcon from '../../../../assets/images/navigator/air/magnifier.png';
import dropmenuArrow from '../../../../assets/images/habbo-skin/slices/dropmenu-default-arrow.png';
import { ListSelect } from '../../../../common/ListSelect';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

interface NavigatorFilterChipsViewProps {
    value: number;
    onChange: (index: number) => void;
    /** Phone layout: the chooser is the magnifier inside the search box instead of a drop menu beside it. */
    handheld?: boolean;
}

export const NavigatorFilterChipsView: FC<NavigatorFilterChipsViewProps> = (props) => {
    const { value, onChange, handheld = false } = props;
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = SearchFilterOptions[value] ? value : 0;

    return (
        <NativeTextTree>
            <div ref={rootRef} className={`${handheld ? 'octane-handheld-nav__filter' : 'octane-navigator-air__filter'}${open ? ' is-open' : ''}`}>
                <ListSelect
                    aria-label={LocalizeText('navigator.filter.anything')}
                    container={rootRef}
                    itemClassName={handheld ? 'octane-handheld-nav__filter-option' : 'octane-navigator-air__filter-option'}
                    options={SearchFilterOptions.map((filter, index) => ({ value: String(index), label: LocalizeText('navigator.filter.' + filter.name) }))}
                    popupClassName={handheld ? 'octane-handheld-nav__filter-list' : 'octane-navigator-air__filter-list'}
                    sideOffset={handheld ? 4 : -1}
                    triggerClassName={handheld ? 'octane-handheld-nav__filter-button' : 'octane-navigator-air__filter-button'}
                    value={String(selected)}
                    renderTrigger={(current) =>
                        handheld ? (
                            <img src={magnifierIcon} alt="" width={13} height={22} />
                        ) : (
                        <>
                            <span>{current?.label}</span>
                            <img src={dropmenuArrow} alt="" width={16} height={16} />
                        </>
                        )
                    }
                    onOpenChange={setOpen}
                    onValueChange={(next) => onChange(Number(next))}
                />
            </div>
        </NativeTextTree>
    );
};
