import { GetEventDispatcher, OctaneEvent } from '@octane/renderer';
import { DispatchEvent } from './DispatchEvent';

export const DispatchMainEvent = (event: OctaneEvent) => DispatchEvent(GetEventDispatcher(), event);
