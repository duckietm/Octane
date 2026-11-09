/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from './FloatingPopover';

describe('FloatingPopover', () => {
    afterEach(() => cleanup());

    it('keeps the content closed until the trigger is clicked', () => {
        render(
            <Popover>
                <PopoverTrigger>open</PopoverTrigger>
                <PopoverContent className="surface" positionerClassName="layer">
                    <span>inside</span>
                </PopoverContent>
            </Popover>
        );

        expect(screen.queryByText('inside')).toBeNull();

        fireEvent.click(screen.getByText('open'));

        const inside = screen.getByText('inside');

        expect(inside.closest('.surface')).not.toBeNull();
        expect(inside.closest('.layer')).not.toBeNull();
    });

    it('reports open changes for controlled use', () => {
        const changes: boolean[] = [];

        render(
            <Popover open={false} onOpenChange={(open) => changes.push(open)}>
                <PopoverTrigger>open</PopoverTrigger>
                <PopoverContent>
                    <span>inside</span>
                </PopoverContent>
            </Popover>
        );

        fireEvent.click(screen.getByText('open'));

        expect(changes).toEqual([true]);
        expect(screen.queryByText('inside')).toBeNull();
    });
});
