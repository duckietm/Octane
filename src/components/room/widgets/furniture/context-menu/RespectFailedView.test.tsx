/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RespectFailedView, respectFailedBody } from './RespectFailedView';

describe('RespectFailedView', () => {
    afterEach(cleanup);

    it('fills the audience size when the client knows it and leaves the text alone when it does not', () => {
        expect(respectFailedBody('audience', '8')).toContain('at least 8 Habbos');
        expect(respectFailedBody('audience', '')).toContain('%users%');
        expect(respectFailedBody('stage', 8)).toContain('on the stage');
    });

    it('shows the reason with its picture and closes on the button', () => {
        const onClose = vi.fn();

        render(<RespectFailedView kind="stage" onClose={onClose} />);

        expect(screen.getByTestId('respect-failed-body')).toHaveTextContent('on the stage');
        expect(document.querySelector('.octane-respect-failed-picture')).toHaveAttribute('src', expect.stringContaining('habbo_talent_show_stage'));

        fireEvent.click(screen.getByRole('button', { name: 'OK' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
