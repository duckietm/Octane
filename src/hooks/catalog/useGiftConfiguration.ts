import { GetGiftWrappingConfigurationComposer, GiftWrappingConfigurationEvent } from '@octane/renderer';
import { UseQueryResult } from '@tanstack/react-query';
import { GiftWrappingConfiguration } from '../../api';
import { useOctaneQuery } from '../../api/octane-query';

/**
 * Wraps the GetGiftWrappingConfigurationComposer / GiftWrappingConfigurationEvent
 * request-response pair as a TanStack query. The configuration is
 * session-stable (box types, ribbon types, colour palette) so the data
 * is cached with `staleTime: Infinity` — the server is asked at most
 * once per session.
 *
 * Replaces the previous pattern in useCatalog where the composer was
 * dispatched eagerly inside an `isVisible` effect and the result was
 * stored in `catalogOptions.giftConfiguration`. Consumers now read the
 * query directly and benefit from the standard TanStack loading/error
 * states.
 */
export const useGiftConfiguration = (options: { enabled?: boolean } = {}): UseQueryResult<GiftWrappingConfiguration> =>
    useOctaneQuery<GiftWrappingConfigurationEvent, GiftWrappingConfiguration>({
        key: ['octane', 'catalog', 'giftConfiguration'],
        request: () => new GetGiftWrappingConfigurationComposer(),
        parser: GiftWrappingConfigurationEvent,
        select: (event) => new GiftWrappingConfiguration(event.getParser()),
        enabled: options.enabled,
        staleTime: Infinity
    });
