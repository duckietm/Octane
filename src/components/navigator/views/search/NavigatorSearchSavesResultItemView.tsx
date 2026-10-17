import { NavigatorDeleteSavedSearchComposer, NavigatorSavedSearch } from '@octane/renderer';
import { FC, MouseEvent } from 'react';
import { LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { useNavigatorUiStore } from '../../../../hooks';
import { BaseButton } from '../../../../common/BaseButton';
import { Hint } from '../../../../common/Tooltip';

export interface NavigatorSearchSavesResultItemViewProps {
    search: NavigatorSavedSearch;
}

const savedSearchLabel = (search: NavigatorSavedSearch) => {
    let code = search.code || '';

    if (code.startsWith('${')) code = code.slice(2, code.length - 1);
    if (code.startsWith('category__')) code = code.slice('category__'.length);

    const title = localizeWithFallback('navigator.searchcode.title.' + code, search.code || code);

    return search.filter ? `${title} - ${search.filter}` : title;
};

export const NavigatorSearchSavesResultItemView: FC<NavigatorSearchSavesResultItemViewProps> = (props) => {
    const { search = null } = props;
    const title = savedSearchLabel(search);

    const openSearch = () => {
        useNavigatorUiStore.getState().setSearch(search.code, search.filter || '');
        useNavigatorUiStore.getState().show();
    };

    const deleteSearch = (event: MouseEvent) => {
        event.stopPropagation();
        SendMessageComposer(new NavigatorDeleteSavedSearchComposer(search.id));
    };

    return (
        <div className="saved-search-row">
            <Hint content={LocalizeText('navigator.tooltip.open.saved.search')}><BaseButton aria-label={LocalizeText('navigator.tooltip.open.saved.search')} type="button" className="saved-search-row__open" onClick={openSearch}>
                <span className="saved-search-row__label">{title}</span>
            </BaseButton></Hint>
            <Hint content={LocalizeText('navigator.tooltip.remove.saved.search')}>
                <BaseButton
                    type="button"
                    className="saved-search-row__delete"
                    aria-label={`${LocalizeText('navigator.tooltip.remove.saved.search')} ${title}`}
                    onClick={deleteSearch}
                />
            </Hint>
        </div>
    );
};
