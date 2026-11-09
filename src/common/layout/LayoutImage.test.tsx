import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LayoutImage } from './LayoutImage';

afterEach(cleanup);

describe('LayoutImage', () => {
    it('leaves the src out when the url is empty, so the browser does not fetch the page again', () => {
        const { container } = render(<LayoutImage imageUrl="" />);

        expect(container.querySelector('img').hasAttribute('src')).toBe(false);
    });

    it('keeps the src when there is a url', () => {
        const { container } = render(<LayoutImage imageUrl="a.png" />);

        expect(container.querySelector('img').getAttribute('src')).toBe('a.png');
    });
});
