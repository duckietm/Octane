/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';
import { HandheldInventorySelectionView } from './HandheldInventorySelectionView';

const place = vi.fn();
const sell = vi.fn();
const remove = vi.fn();

const renderBar = (withDrawer = true) =>
    render(
        <HandheldInventorySelectionView
            actions={withDrawer ? [{ key: 'sell', label: 'Sell', onClick: sell }, { key: 'delete', label: 'Delete', danger: true, onClick: remove }] : []}
            meta="4 tradable"
            name="Glowball"
            preview={withDrawer ? <div data-testid="preview" /> : null}
            primary={{ key: 'place', label: 'Place in room', onClick: place }}
            thumb={<img alt="" src="glowball.png" />}
        />
    );

beforeEach(() => {
    place.mockClear();
    sell.mockClear();
    remove.mockClear();
    act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('HandheldInventorySelectionView', () => {
    it('shows the picture, name, line and the main action as a bar', () => {
        renderBar();

        expect(screen.getByText('Glowball')).toBeInTheDocument();
        expect(screen.getByText('4 tradable')).toBeInTheDocument();
        expect(screen.queryByTestId('preview')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Sell' })).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Place in room' }));

        expect(place).toHaveBeenCalledTimes(1);
    });

    it('opens the preview and the other actions from "more" and from the picture', () => {
        renderBar();

        fireEvent.click(screen.getByRole('button', { name: 'More actions' }));

        expect(screen.getByTestId('preview')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Sell' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        expect(sell).toHaveBeenCalledTimes(1);
        expect(remove).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Show the preview' }));

        expect(screen.queryByTestId('preview')).toBeNull();
    });

    it('keeps the preview and the other actions open on a phone held on its side', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'landscape' } }));
        renderBar();

        expect(screen.getByTestId('preview')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Place in room' })).toBeInTheDocument();
    });

    it('offers no "more" when there is nothing behind it', () => {
        renderBar(false);

        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Show the preview' })).toBeDisabled();
    });
});
