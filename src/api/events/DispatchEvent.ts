import { IEventDispatcher, OctaneEvent } from '@octane/renderer';

export const DispatchEvent = (eventDispatcher: IEventDispatcher, event: OctaneEvent) => eventDispatcher.dispatchEvent(event);
