import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CatalogLayoutInformationView } from './CatalogLayoutInformationView';

const openUrl = vi.fn();
const simpleAlert = vi.fn();

vi.mock('../../../../../api', () => ({
    LocalizeText: (key: string) => key,
    localizeWithFallback: (key: string, fallback: string) => (key === 'link.format.monkey' ? 'https://store.example/monkey' : fallback),
    OpenUrl: (url: string) => openUrl(url),
    SanitizeHtml: (text: string) => text
}));

vi.mock('../../../../../hooks', () => ({
    useNotification: () => ({ simpleAlert })
}));

afterEach(() => {
    cleanup();
    openUrl.mockClear();
    simpleAlert.mockClear();
});

const page = (layoutCode: string) =>
    ({
        layoutCode,
        localization: {
            getImage: (index: number) => (index === 1 ? '/teaser.gif' : index === 2 ? '/store.gif' : ''),
            getText: (index: number) => (index === 0 ? 'Lost Monkey' : '')
        }
    }) as any;

describe('catalog information layout teaser regions (layout_monkey.xml)', () => {
    it('opens the store link with the external-link alert from both monkey regions', () => {
        render(<CatalogLayoutInformationView hideNavigation={() => undefined} page={page('monkey')} />);

        fireEvent.click(screen.getByTestId('catalog-information-link-1'));
        fireEvent.click(screen.getByTestId('catalog-information-link-2'));

        expect(openUrl).toHaveBeenCalledTimes(2);
        expect(openUrl).toHaveBeenCalledWith('https://store.example/monkey');
        expect(simpleAlert).toHaveBeenCalledWith('catalog.alert.external.link.desc', null, null, null, 'catalog.alert.external.link.title');
    });

    it('keeps the images of the other information layouts inert', () => {
        const { container } = render(<CatalogLayoutInformationView hideNavigation={() => undefined} page={page('info_duckets')} />);

        expect(screen.queryByTestId('catalog-information-link-1')).toBeNull();
        expect(container.querySelectorAll('button')).toHaveLength(0);
        expect(container.querySelectorAll('img')).toHaveLength(2);
    });
});
