import { OctaneEvent } from '@octane/renderer';
import { DispatchEvent } from './DispatchEvent';
import { UI_EVENT_DISPATCHER } from './UI_EVENT_DISPATCHER';

export const DispatchUiEvent = (event: OctaneEvent) => DispatchEvent(UI_EVENT_DISPATCHER, event);
