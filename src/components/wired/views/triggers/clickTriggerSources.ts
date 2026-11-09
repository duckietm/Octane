import { WiredSourceOption } from '../WiredSourcesSelector';

/**
 * Furni sources of the Click Furni and Click Tile triggers. The server's InputSourcesConf lists only the picks (100)
 * and the selector (200), so a box never offers the triggering furni (0). A row stored with 0 before that rule keeps
 * it (the server still saves a source the box already holds), so 0 stays shown for that box only.
 */
export const CLICK_TRIGGER_FURNI_SOURCES: WiredSourceOption[] = [
    { value: 100, label: 'wiredfurni.params.sources.furni.100' },
    { value: 200, label: 'wiredfurni.params.sources.furni.200' }
];

const STORED_TRIGGER_SOURCE: WiredSourceOption = { value: 0, label: 'wiredfurni.params.sources.furni.0' };

export const normalizeClickTriggerFurniSource = (value: number) =>
    value === 0 || CLICK_TRIGGER_FURNI_SOURCES.some((option) => option.value === value) ? value : 100;

/** The options for a box whose stored source is `stored`. */
export const clickTriggerFurniSources = (stored: number): WiredSourceOption[] =>
    stored === 0 ? [...CLICK_TRIGGER_FURNI_SOURCES, STORED_TRIGGER_SOURCE] : CLICK_TRIGGER_FURNI_SOURCES;
