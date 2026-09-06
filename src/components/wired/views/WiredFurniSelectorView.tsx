import { FC } from 'react';
import { LocalizeText } from '../../../api';
import { Text } from '../../../common';
import { useWired } from '../../../hooks';

export const WiredFurniSelectorView: FC<{}> = () => {
    const { trigger = null, furniIds = [] } = useWired();

    const count = furniIds?.length ?? 0;
    const limit = trigger?.maximumItemSelectionCount ?? 0;

    // The shipped caption template historically omitted %count% ("Select Furni [/%limit%]"), so the
    // selected count never rendered and appeared frozen at "[/20]". Inject the count when the
    // localized text still lacks a "count/limit" figure — works with both the old and fixed template.
    const rawCaption = LocalizeText('wiredfurni.pickfurnis.caption', ['count', 'limit'], [count.toString(), limit.toString()]);
    const caption = /\d+\s*\/\s*\d+/.test(rawCaption) ? rawCaption : rawCaption.replace(/\[\s*\//, `[${count}/`);

    return (
        <div className="flex flex-col gap-1 octane-wired__furni-selector">
            <Text bold className="octane-wired__furni-selector-title">
                {caption}
            </Text>
            <Text small className="octane-wired__furni-selector-description">
                {LocalizeText('wiredfurni.pickfurnis.desc')}
            </Text>
        </div>
    );
};
