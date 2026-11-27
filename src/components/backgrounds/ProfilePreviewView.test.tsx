/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProfilePreviewView } from './ProfilePreviewView';

describe('ProfilePreviewView', () => {
    afterEach(cleanup);

    const avatar = () => screen.getByTestId('profile-preview').querySelector<HTMLElement>('.avatar-image');
    const overlay = () => screen.getByTestId('profile-preview').querySelector<HTMLElement>('.profile-overlay');

    it('draws the avatar where it always stood when no pose is given', () => {
        render(<ProfilePreviewView figure="hd-180-1" backgroundId={1} standId={2} overlayId={3} />);

        expect(avatar()?.style.translate ?? '').toBe('');
        expect(overlay()?.style.translate ?? '').toBe('');
    });

    it('moves the avatar by its offset, and a costume effect with it', () => {
        render(<ProfilePreviewView figure="hd-180-1" backgroundId={1} standId={2} overlayId={7} direction={4} offsetX={-6} offsetY={10} />);

        expect(avatar()?.style.translate).toBe('-6px 10px');
        expect(overlay()?.style.translate).toBe('-6px 10px');
    });

    it('leaves an effect that frames the picture where it is', () => {
        render(<ProfilePreviewView figure="hd-180-1" backgroundId={1} standId={2} overlayId={2} offsetX={4} offsetY={0} />);

        expect(avatar()?.style.translate).toBe('4px 0px');
        expect(overlay()?.style.translate ?? '').toBe('');
    });

    it('clamps an offset beyond the box', () => {
        render(<ProfilePreviewView figure="hd-180-1" backgroundId={1} standId={2} overlayId={0} offsetX={50} offsetY={-50} />);

        expect(avatar()?.style.translate).toBe('16px -16px');
    });
});
