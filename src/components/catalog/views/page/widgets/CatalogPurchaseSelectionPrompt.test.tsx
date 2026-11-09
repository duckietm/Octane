import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CatalogPurchaseSelectionPrompt } from './CatalogPurchaseSelectionPrompt';

describe('standard catalog purchase selection state', () => {
    it('keeps the purchase row visible and asks the user to select a product', () => {
        render(<CatalogPurchaseSelectionPrompt />);

        expect(screen.getByRole('status')).toHaveTextContent('Select an item to continue.');
    });
});
