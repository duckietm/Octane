import { ClubGiftInfoEvent, ClubGiftInfoParser, GetClubGiftInfo } from '@octane/renderer';
import { UseQueryResult } from '@tanstack/react-query';
import { useOctaneEventInvalidator, useOctaneQuery } from '../../api/octane-query';

const CLUB_GIFTS_KEY = ['octane', 'catalog', 'clubGifts'] as const;

/**
 * Habbo Club gift availability (counts of pending gifts, days until
 * next gift, gift list). The server replies once to GetClubGiftInfo
 * and then pushes ClubGiftInfoEvent again every time the user claims
 * a gift via SelectClubGiftComposer — so the cache needs to be
 * invalidated on each push, not just hydrated by the first response.
 *
 * Pair the query with useOctaneEventInvalidator so unsolicited pushes
 * mark the slot stale; the next render of any consumer triggers a
 * re-fetch (which, since the server just pushed, will resolve almost
 * immediately with the fresh data the server already sent us).
 *
 * Replaces the previous useCatalog listener that stuffed
 * `parser` into `catalogOptions.clubGifts`.
 */
export const useClubGifts = (options: { enabled?: boolean } = {}): UseQueryResult<ClubGiftInfoParser> => {
    const query = useOctaneQuery<ClubGiftInfoEvent, ClubGiftInfoParser>({
        key: CLUB_GIFTS_KEY as unknown as string[],
        request: () => new GetClubGiftInfo(),
        parser: ClubGiftInfoEvent,
        select: (event) => event.getParser(),
        enabled: options.enabled,
        staleTime: Infinity
    });

    useOctaneEventInvalidator<ClubGiftInfoEvent>(ClubGiftInfoEvent, CLUB_GIFTS_KEY as unknown as string[]);

    return query;
};
