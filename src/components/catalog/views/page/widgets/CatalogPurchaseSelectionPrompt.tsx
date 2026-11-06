import { FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../../../../api';
import { CssNativeText } from '../../../../../common/native-text/CssNativeText';

const LOCALIZATION_KEY = 'catalog.purchase.select.info';

export const CatalogPurchaseSelectionPrompt: FC = () => {
    const localizedText = LocalizeText(LOCALIZATION_KEY);
    const text =
        !localizedText || localizedText === LOCALIZATION_KEY || localizedText === `\${${LOCALIZATION_KEY}}` ? localizeWithFallback('octane.catalog.select_an_item_to_continue', 'Select an item to continue.') : localizedText;

    return (
        <span className="octane-catalog-purchase-selection-prompt" role="status">
            <CssNativeText text={text} textStyle="u_headline_small" />
        </span>
    );
};
