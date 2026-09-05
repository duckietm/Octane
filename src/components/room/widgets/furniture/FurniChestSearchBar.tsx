import { FC, KeyboardEvent } from 'react';
import { LocalizeText } from '../../../../api';

export const FurniChestSearchBar: FC<{
    draft: string;
    onDraftChange: (value: string) => void;
    onApply: (value: string) => void;
    onClear: () => void;
}> = ({ draft, onDraftChange, onApply, onClear }) => {
    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onApply(draft);
            return;
        }
        if (e.key === 'Escape') {
            onClear();
        }
    };

    return (
        <div className="octane-chest__search">
            {!draft && (
                <span className="octane-chest__search-placeholder">{LocalizeText('catalog.search.title')}</span>
            )}
            <input
                type="text"
                className="octane-chest__search-input"
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={onKeyDown}
            />
            {draft.length > 0 && (
                <button type="button" className="octane-chest__search-clear" onClick={onClear} aria-label="Clear">
                    ×
                </button>
            )}
        </div>
    );
};
