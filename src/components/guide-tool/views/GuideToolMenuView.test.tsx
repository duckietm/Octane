/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuideToolMenuView } from './GuideToolMenuView';

const renderMenu = (isOnDuty: boolean, processAction = vi.fn()) => {
    render(
        <GuideToolMenuView
            guardiansOnDuty={0}
            guidesOnDuty={0}
            helpersOnDuty={0}
            isHandlingBullyReports={false}
            isHandlingGuideRequests={false}
            isHandlingHelpRequests={false}
            isOnDuty={isOnDuty}
            processAction={processAction}
            setIsHandlingBullyReports={() => undefined}
            setIsHandlingGuideRequests={() => undefined}
            setIsHandlingHelpRequests={() => undefined}
        />
    );

    return processAction;
};

describe('GuideToolMenuView duty switch', () => {
    afterEach(() => cleanup());

    it('is a switch that says whether the guide is on duty', () => {
        renderMenu(true);

        expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');

        cleanup();
        renderMenu(false);

        expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    });

    it('toggles the duty when pressed', () => {
        const processAction = renderMenu(false);

        fireEvent.click(screen.getByRole('switch'));

        expect(processAction).toHaveBeenCalledWith('toggle_duty');
    });
});
