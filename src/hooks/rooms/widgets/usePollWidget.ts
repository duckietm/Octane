import { usePollActions } from './usePollActions';

/**
 * @deprecated Prefer `usePollActions` for components that dispatch
 * votes/accepts/rejects. The corresponding subscriptions are now mounted
 * once by `RoomWidgetsView` via `usePollSubscriptions`, so this shim no
 * longer needs to register them transitively.
 *
 * Kept only to preserve the `{ startPoll, rejectPoll, answerPoll }`
 * shape for any out-of-tree consumer; remove once nothing imports it.
 * @public
 */
export const usePollWidget = () => usePollActions();
