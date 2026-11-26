/* @vitest-environment jsdom */
import { AddLinkEventTracker, ILinkEventTracker } from '@octane/renderer';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserAccountSettingsView } from './UserAccountSettingsView';

const tracker = (): ILinkEventTracker => vi.mocked(AddLinkEventTracker).mock.calls.at(-1)[0] as ILinkEventTracker;

const open = (url: string) => act(() => tracker().linkReceived(url));

beforeEach(() => vi.mocked(AddLinkEventTracker).mockClear());
afterEach(cleanup);

describe('UserAccountSettingsView links', () => {
    it('opens on the account menu', () => {
        render(<UserAccountSettingsView />);
        open('user-account-settings/show');

        expect(screen.getByText('Reset password')).toBeInTheDocument();
        expect(screen.getByText('Change email')).toBeInTheDocument();
    });

    it('opens straight on the form a link names, and ignores an unknown one', () => {
        render(<UserAccountSettingsView />);
        open('user-account-settings/show/username');

        expect(screen.queryByText('Reset password')).not.toBeInTheDocument();
        expect(document.querySelectorAll('input').length).toBeGreaterThan(0);

        open('user-account-settings/show/nothing');
        expect(screen.getByText('Reset password')).toBeInTheDocument();
    });
});
