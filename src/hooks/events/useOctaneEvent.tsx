import { GetEventDispatcher, OctaneEvent } from '@octane/renderer';
import { useEventDispatcher } from './useEventDispatcher';

export const useOctaneEvent = <T extends OctaneEvent>(type: string | string[], handler: (event: T) => void, enabled = true) =>
    useEventDispatcher(type, GetEventDispatcher(), handler, enabled);
