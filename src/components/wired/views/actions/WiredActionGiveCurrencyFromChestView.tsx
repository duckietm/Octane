import { FC } from 'react';
import { WiredActionChestRewardBaseView } from './WiredActionChestRewardBaseView';
import { localizeWithFallback } from '../../../../api';

// Official give currency from chest (45): the shared chest reward editor, with the earnings category
// (11 games, 13 agency) as the sixth int.
const EARNINGS_CATEGORY = {
    titleKey: 'wiredfurni.params.earnings_category',
    get title() { return localizeWithFallback('octane.wired.earnings_category', 'Earnings category:'); },
    options: [
        { value: 11, key: 'wiredfurni.params.earnings_category.11', label: 'Games' },
        { value: 13, key: 'wiredfurni.params.earnings_category.13', label: 'Agency' }
    ],
    defaultValue: 11,
    dropdown: true
};

export const WiredActionGiveCurrencyFromChestView: FC<{}> = () => <WiredActionChestRewardBaseView extra={EARNINGS_CATEGORY} />;
