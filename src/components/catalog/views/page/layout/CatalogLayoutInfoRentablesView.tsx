import { FC, useEffect } from 'react';
import { GetConfigurationValue, SanitizeHtml } from '../../../../../api';
import { LayoutCurrencyIcon } from '../../../../../common';
import { CatalogLayoutProps } from './CatalogLayout.types';

// The official ctlg_info_rentables layout: five rules, each with the ducket
// icon, a text (ctlg_text_1..5) and catalogue/rentables_rulepicN.gif from
// the image library.
const RENTABLE_RULE_COUNT = 5;
const DUCKETS_CURRENCY_TYPE = 0;

export const getRentableRuleImageUrl = (imageLibraryUrl: string, index: number): string => `${imageLibraryUrl ?? ''}catalogue/rentables_rulepic${index}.gif`;

export const CatalogLayoutInfoRentablesView: FC<CatalogLayoutProps> = ({ page, hideNavigation }) => {
    const description = page.localization.getText(0);
    const rules = Array.from({ length: RENTABLE_RULE_COUNT }, (_, index) => page.localization.getText(index + 1));
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    useEffect(() => {
        hideNavigation?.();
    }, [hideNavigation]);

    return (
        <article className="octane-catalog-info-rentables">
            {!!description && <div className="octane-catalog-info-rentables__description" dangerouslySetInnerHTML={{ __html: SanitizeHtml(description) }} />}
            <ol className="octane-catalog-info-rentables__rules">
                {rules.map((text, index) => (
                    <li className="octane-catalog-info-rentables__rule" key={index}>
                        <LayoutCurrencyIcon className="octane-catalog-info-rentables__icon" type={DUCKETS_CURRENCY_TYPE} />
                        <div className="octane-catalog-info-rentables__text" dangerouslySetInnerHTML={{ __html: SanitizeHtml(text ?? '') }} />
                        <img alt="" className="octane-catalog-info-rentables__picture" src={getRentableRuleImageUrl(imageLibraryUrl, index + 1)} />
                    </li>
                ))}
            </ol>
        </article>
    );
};
