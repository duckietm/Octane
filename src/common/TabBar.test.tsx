/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TabBar, TabBarTab } from './TabBar';

const TABS = ['one', 'two', 'three'];

const Demo = ({ initial = 'one' as string | null, onPick }: { initial?: string | null; onPick?: (id: string) => void }) => {
    const [active, setActive] = useState<string | null>(initial);

    return (
        <TabBar aria-label="Sections" className="bar" value={active}>
            {TABS.map((id) => (
                <TabBarTab
                    key={id}
                    className={`tab${active === id ? ' is-active' : ''}`}
                    value={id}
                    onClick={() => {
                        setActive(id);
                        onPick?.(id);
                    }}
                >
                    {id}
                </TabBarTab>
            ))}
        </TabBar>
    );
};

describe('TabBar', () => {
    afterEach(() => cleanup());

    it('renders a tablist with the host classes and the selected tab', () => {
        render(<Demo />);

        const list = screen.getByRole('tablist', { name: 'Sections' });

        expect(list.classList.contains('bar')).toBe(true);
        expect(screen.getByRole('tab', { name: 'one' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'two' })).toHaveAttribute('aria-selected', 'false');
    });

    it('runs the tab onClick, also for the tab that is already selected', () => {
        const onPick = vi.fn();

        render(<Demo onPick={onPick} />);
        fireEvent.click(screen.getByRole('tab', { name: 'two' }));
        fireEvent.click(screen.getByRole('tab', { name: 'two' }));

        expect(onPick).toHaveBeenCalledTimes(2);
        expect(screen.getByRole('tab', { name: 'two' })).toHaveAttribute('aria-selected', 'true');
    });

    it('selects nothing when the value is null', () => {
        render(<Demo initial={null} />);

        expect(screen.getAllByRole('tab').every((tab) => tab.getAttribute('aria-selected') === 'false')).toBe(true);
    });

    it('uses roving focus: only the selected tab is in the tab order', () => {
        render(<Demo />);

        expect(screen.getByRole('tab', { name: 'one' })).toHaveAttribute('tabindex', '0');
        expect(screen.getByRole('tab', { name: 'two' })).toHaveAttribute('tabindex', '-1');
    });
});
