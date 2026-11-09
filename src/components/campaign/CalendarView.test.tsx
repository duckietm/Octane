import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks', () => ({ useHasPermission: () => false }));
vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api')>()),
    LocalizeText: (key: string, _names?: string[], values?: string[]) => (values?.length ? `${key}:${values.join(',')}` : key)
}));

import { CalendarView } from './CalendarView';

afterEach(() => cleanup());

const renderCalendar = (openPackage = vi.fn(), receivedProducts = new Map(), openedRewards = new Map()) =>
    render(
        <CalendarView
            campaignName="xmas"
            currentDay={2}
            numDays={6}
            missedDays={[1]}
            openedDays={[0]}
            receivedProducts={receivedProducts}
            openedRewards={openedRewards}
            openPackage={openPackage}
            onClose={() => {}}
        />
    );

describe('CalendarView (AIR calendar)', () => {
    it('shows every campaign day once, opens on the current day and tells its state', () => {
        renderCalendar();
        const container = document.body;

        expect(container.querySelectorAll('.octane-calendar-day')).toHaveLength(6);
        expect(screen.getByText('campaign.calendar.heading.day:3')).toBeTruthy();
        expect(screen.getByText('campaign.calendar.info.available.desktop')).toBeTruthy();
        expect(container.querySelector('.octane-calendar-day.is-active')?.getAttribute('data-state')).toBe('2');
        expect(container.querySelectorAll('.octane-calendar-day__lock')).toHaveLength(4);
        expect(container.querySelectorAll('.octane-calendar-day__opened')).toHaveLength(1);
    });

    it('steps with the arrows and stops at the first and last day', () => {
        renderCalendar();

        fireEvent.click(screen.getByRole('button', { name: 'previous' }));
        fireEvent.click(screen.getByRole('button', { name: 'previous' }));
        expect(screen.getByText('campaign.calendar.heading.day:1')).toBeTruthy();
        expect(screen.getByText('campaign.calendar.info.unlocked')).toBeTruthy();
        expect((screen.getByRole('button', { name: 'previous' }) as HTMLButtonElement).disabled).toBe(true);

        for (let step = 0; step < 6; step++) fireEvent.click(screen.getByRole('button', { name: 'next' }));
        expect(screen.getByText('campaign.calendar.heading.day:6')).toBeTruthy();
        expect(screen.getByText('campaign.calendar.info.future')).toBeTruthy();
    });

    it('selects a day on the first click and opens the available day on the second', () => {
        const openPackage = vi.fn();
        renderCalendar(openPackage);

        fireEvent.click(screen.getByRole('button', { name: 'day 2' }));
        expect(screen.getByText('campaign.calendar.info.expired')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'day 2' }));
        expect(openPackage).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'day 3' }));
        fireEvent.click(screen.getByRole('button', { name: 'day 3' }));
        expect(openPackage).toHaveBeenCalledWith(2, false);
    });

    it('names the reward of a day opened just now, as AIR does', () => {
        renderCalendar(vi.fn(), new Map([[2, { productName: '50 credits', customImage: '', furnitureClassName: '' }]]));

        expect(screen.getByText('campaign.calendar.heading.product.received')).toBeTruthy();
        expect(screen.getByText('50 credits')).toBeTruthy();
    });

    it('shows the reward of a day opened before in its box, without the received heading', () => {
        renderCalendar(vi.fn(), new Map(), new Map([[0, { productName: 'Coins', customImage: 'calendar/coins.png', furnitureClassName: '' }]]));

        expect(document.body.querySelector('.octane-calendar-day[data-state="1"] .octane-calendar-day__icon')).toBeTruthy();
        expect(screen.queryByText('campaign.calendar.heading.product.received')).toBeNull();
    });
});
