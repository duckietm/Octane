/* @vitest-environment jsdom */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IPurchasableOffer } from '../../../../../api/catalog/IPurchasableOffer';
import { DESKTOP_LAYOUT } from '../../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../../state/handheldStore';
import { HandheldCatalogPlaceButtonView } from './HandheldCatalogPlaceButtonView';

const offer = { offerId: 7 } as IPurchasableOffer;
const onPlace = vi.fn();
const isDraggable = vi.fn(() => true);
const phone = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

beforeEach(() => {
    onPlace.mockReset();
    isDraggable.mockReset().mockReturnValue(true);
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('HandheldCatalogPlaceButtonView', () => {
    it('is not there on desktop, where a tile is dragged into the room', () => {
        const { container } = render(<HandheldCatalogPlaceButtonView isDraggable={isDraggable} offer={offer} onPlace={onPlace} />);

        expect(container).toBeEmptyDOMElement();
        // The room check is not even asked on desktop.
        expect(isDraggable).not.toHaveBeenCalled();
    });

    it('hands the offer to the room placement on a phone', () => {
        phone();
        render(<HandheldCatalogPlaceButtonView isDraggable={isDraggable} offer={offer} onPlace={onPlace} />);

        fireEvent.click(screen.getByRole('button', { name: 'Place in room' }));

        expect(onPlace).toHaveBeenCalledWith(offer);
    });

    it('stays away for an offer that cannot go into this room', () => {
        phone();
        isDraggable.mockReturnValue(false);
        const { container } = render(<HandheldCatalogPlaceButtonView isDraggable={isDraggable} offer={offer} onPlace={onPlace} />);

        expect(container).toBeEmptyDOMElement();
    });
});
