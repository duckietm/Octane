import { BundleDiscountRuleset, BundleDiscountRulesetMessageEvent, GetBundleDiscountRulesetComposer } from '@octane/renderer';
import { UseQueryResult } from '@tanstack/react-query';
import { useOctaneQuery } from '../../api/octane-query';

export const useCatalogBundleDiscountRuleset = (options: { enabled?: boolean } = {}): UseQueryResult<BundleDiscountRuleset> =>
    useOctaneQuery<BundleDiscountRulesetMessageEvent, BundleDiscountRuleset>({
        key: ['octane', 'catalog', 'bundleDiscountRuleset'],
        request: () => new GetBundleDiscountRulesetComposer(),
        parser: BundleDiscountRulesetMessageEvent,
        select: (event) => event.getParser().bundleDiscountRuleset,
        enabled: options.enabled,
        staleTime: Infinity
    });
