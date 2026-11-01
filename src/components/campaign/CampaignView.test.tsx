/* @vitest-environment jsdom */

import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    sent: [] as unknown[],
    link: null as { linkReceived: (url: string) => void } | null,
    view: null as { openPackage: (id: number) => void; openedDays: number[]; receivedProducts: Map<number, unknown> } | null
}));

vi.mock('@octane/renderer', () => {
    class Composer {
        constructor(public campaign: string, public day: number) {}
    }

    return {
        AddLinkEventTracker: (tracker: { linkReceived: (url: string) => void }) => (state.link = tracker),
        RemoveLinkEventTracker: () => undefined,
        CampaignCalendarDataMessageEvent: class {},
        CampaignCalendarDoorOpenedMessageEvent: class {},
        OpenCampaignCalendarDoorComposer: Composer,
        OpenCampaignCalendarDoorAsStaffComposer: Composer
    };
});
vi.mock('../../api', () => ({
    CalendarItem: class {
        constructor(public productName: string) {}
    },
    SendMessageComposer: (composer: unknown) => state.sent.push(composer)
}));
vi.mock('../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => state.handlers.set(type, handler)
}));
vi.mock('./CalendarView', () => ({
    CalendarView: (props: typeof state.view) => {
        state.view = props;
        return null;
    }
}));

import { CampaignCalendarDataMessageEvent, CampaignCalendarDoorOpenedMessageEvent } from '@octane/renderer';
import { CampaignView } from './CampaignView';

const calendar = {
    campaignName: 'advent',
    currentDay: 3,
    missedDays: [],
    campaignDays: 24,
    openedDays: [] as number[],
    openedRewards: [],
    clone() {
        return { ...this, openedDays: [...this.openedDays] };
    }
};

describe('CampaignView', () => {
    it('opens one door at a time and files the prize under the door that was asked for', () => {
        render(<CampaignView />);
        act(() => state.handlers.get(CampaignCalendarDataMessageEvent)?.({ getParser: () => ({ calendarData: calendar }) }));
        act(() => state.link?.linkReceived('openView/calendar'));

        act(() => state.view?.openPackage(1));
        act(() => state.view?.openPackage(2));
        expect(state.sent).toHaveLength(1);

        act(() =>
            state.handlers.get(CampaignCalendarDoorOpenedMessageEvent)?.({ getParser: () => ({ doorOpened: true, productName: 'teddy' }) })
        );

        expect(state.view?.openedDays).toEqual([1]);
        expect(state.view?.receivedProducts.get(1)).toMatchObject({ productName: 'teddy' });

        act(() => state.view?.openPackage(2));
        expect(state.sent).toHaveLength(2);
    });
});
