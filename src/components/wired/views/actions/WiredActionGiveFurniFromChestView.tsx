import { FC } from 'react';
import { WiredActionChestRewardBaseView } from './WiredActionChestRewardBaseView';
import { localizeWithFallback } from '../../../../api';

// Official give furni from chest (46): the shared chest reward editor, with the iteration order
// (0 random, 1 oldest first, 2 newest first) as the sixth int; nothing to choose when giving everything.
const ITERATION_TYPE = {
    titleKey: 'wiredfurni.params.chest_iteration_type',
    get title() { return localizeWithFallback('octane.wired.what_is_given', 'What is given:'); },
    options: [
        { value: 0, key: 'wiredfurni.params.chest_iteration_type.0', label: 'Random' },
        { value: 1, key: 'wiredfurni.params.chest_iteration_type.1', get label() { return localizeWithFallback('octane.wired.oldest_item_first', 'Oldest item first'); } },
        { value: 2, key: 'wiredfurni.params.chest_iteration_type.2', get label() { return localizeWithFallback('octane.wired.most_recent_item_first', 'Most recent item first'); } }
    ],
    defaultValue: 0,
    disabledWhenEverything: true
};

export const WiredActionGiveFurniFromChestView: FC<{}> = () => <WiredActionChestRewardBaseView extra={ITERATION_TYPE} />;
