import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { Select } from '../../../common/Select';
import { HandheldRsField } from './room-settings/HandheldRoomSettingsParts';

interface HandheldEnforceCategoryViewProps {
    categories: { id: number; name: string }[];
    categoryId: number;
    tradeOptions: { value: number; key: string; fallback: string }[];
    tradeMode: number;
    onCategory: (id: number) => void;
    onTradeMode: (mode: number) => void;
    onSave: () => void;
    onClose: () => void;
}

/**
 * The category the server asks for after a room was created or saved, on a phone: a centred card over everything
 * (HandheldRoomSettings.css) with the two choices as 44 px drop-downs and OK. NavigatorEnforceCategoryView keeps the
 * choice and sends it.
 */
export const HandheldEnforceCategoryView: FC<HandheldEnforceCategoryViewProps> = (props) => {
    const { categories, categoryId, tradeOptions, tradeMode } = props;
    const categoryLabel = localizeWithFallback('navigator.category', 'Category');
    const tradeLabel = localizeWithFallback('navigator.roomsettings.trade_settings', localizeWithFallback('navigator.tradesettings', 'Trading'));

    return (
        <NativeTextTree>
            <div className="octane-handheld-rs-modal" data-testid="enforce-category">
                <div aria-labelledby="octane-handheld-rs-enforce-title" aria-modal="true" className="octane-handheld-rs__dialog" role="dialog">
                    <div className="octane-handheld-rs__dialog-head">
                        <h3 className="octane-handheld-rs__dialog-title" id="octane-handheld-rs-enforce-title">
                            {localizeWithFallback('navigator.enforcecategory.title', 'Choose a category')}
                        </h3>
                        <BaseButton
                            aria-label={localizeWithFallback('generic.close', 'Close')}
                            className="octane-handheld-rs__dialog-close"
                            onClick={props.onClose}
                        >
                            <svg aria-hidden="true" viewBox="0 0 16 16">
                                <path d="M4 4 L12 12 M12 4 L4 12" />
                            </svg>
                        </BaseButton>
                    </div>
                    <p className="octane-handheld-rs__dialog-text">
                        {localizeWithFallback('navigator.enforcecategory.info', 'Your room needs a category before others can find it. Pick one below.')}
                    </p>
                    <HandheldRsField label={categoryLabel}>
                        <Select
                            aria-label={categoryLabel}
                            className="octane-handheld-rs__select"
                            value={categoryId}
                            onChange={(event) => props.onCategory(Number(event.target.value))}
                        >
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {localizeWithFallback(category.name, category.name)}
                                </option>
                            ))}
                        </Select>
                    </HandheldRsField>
                    <HandheldRsField label={tradeLabel}>
                        <Select
                            aria-label={tradeLabel}
                            className="octane-handheld-rs__select"
                            value={tradeMode}
                            onChange={(event) => props.onTradeMode(Number(event.target.value))}
                        >
                            {tradeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {localizeWithFallback(option.key, option.fallback)}
                                </option>
                            ))}
                        </Select>
                    </HandheldRsField>
                    <div className="octane-handheld-rs__dialog-actions">
                        <BaseButton className="octane-handheld-rs__button is-primary" disabled={categoryId < 0} onClick={props.onSave}>
                            {localizeWithFallback('generic.ok', 'OK')}
                        </BaseButton>
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
