/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { getClickedAnchor } from './getClickedAnchor';

describe('getClickedAnchor', () =>
{
    it('finds the link when the click lands on an element inside it', () =>
    {
        document.body.innerHTML = '<a href="https://example.test/page"><b id="inside">text</b></a><p id="outside">no link</p>';

        const anchor = document.querySelector('a');

        expect(getClickedAnchor(document.getElementById('inside'))).toBe(anchor);
        expect(getClickedAnchor(anchor)).toBe(anchor);
        expect(getClickedAnchor(document.getElementById('outside'))).toBeNull();
        expect(getClickedAnchor(null)).toBeNull();
    });
});
