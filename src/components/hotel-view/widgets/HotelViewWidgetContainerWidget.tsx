import type { IHotelViewLandingSlot } from '@octane/renderer';
import { CurrentTimingCodeMessageEvent, GetCurrentTimingCodeMessageComposer } from '@octane/renderer';
import { FC, ReactElement, useEffect, useState } from 'react';
import { GetConfigurationValue, SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../../hooks';
import { getWidgetContainerWidgetKey, isHotelViewOfficialWidgetType, isWidgetContainerAnswerForSchedule } from '../hotelViewWidgets';

export interface HotelViewWidgetContainerWidgetProps {
    slot: IHotelViewLandingSlot;
    slotNumber: number;
    resolveImageUrl: (url: string) => string;
    onLinkClick: (link: string) => void;
    /** `LandingViewWidgetType.getWidgetForType` for the widget the timing code selected. */
    renderWidget: (type: string) => ReactElement | null;
}

const readSlotConfigString = (configJson: string, key: string): string => {
    try {
        const parsed = JSON.parse(configJson);
        const value = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>)[key] : undefined;

        return typeof value === 'string' ? value : '';
    } catch {
        return '';
    }
};

/**
 * `WidgetContainerWidget.as`: a slot that holds whichever widget is scheduled
 * right now. It sends its own scheduling string with `GetCurrentTimingCode`
 * (2912), and the server answers `CurrentTimingCode` (1745) with the same string
 * plus the code that is due; `landing.view.<code>.widget` then names the widget
 * to build. An empty code leaves the slot blank.
 */
export const HotelViewWidgetContainerWidget: FC<HotelViewWidgetContainerWidgetProps> = (props) => {
    const { slot, slotNumber, renderWidget } = props;
    const [code, setCode] = useState('');
    const schedulingStr = readSlotConfigString(slot.configJson, 'conf') || GetConfigurationValue<string>(`landing.view.dynamic.slot.${slotNumber}.conf`, '');

    useEffect(() => {
        if (!schedulingStr) return;

        SendMessageComposer(new GetCurrentTimingCodeMessageComposer(schedulingStr));
    }, [schedulingStr]);

    useMessageEvent<CurrentTimingCodeMessageEvent>(CurrentTimingCodeMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser || !isWidgetContainerAnswerForSchedule(parser.schedulingStr, schedulingStr)) return;

        setCode(parser.code || '');
    });

    if (!code) return null;

    const type = GetConfigurationValue<string>(getWidgetContainerWidgetKey(code), '');

    // A container can never hold another container: the official layout anchors a
    // single widget placeholder inside the slot.
    if (!type || type === 'widgetcontainer') return null;
    if (!isHotelViewOfficialWidgetType(type)) return null;

    return <div className="hotelview-widget-container">{renderWidget(type)}</div>;
};
