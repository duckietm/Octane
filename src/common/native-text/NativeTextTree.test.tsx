import { cleanup, render, screen } from '@testing-library/react';
import { FC, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NativeTextTree } from './NativeTextTree';
import { forceNativeTextEnabled } from './nativeTextEnabled';

vi.mock('./NativeLabel', () => ({
    NativeLabel: ({ text, stateKey }: { text: string; stateKey: string }) => (
        <span data-state={stateKey} data-testid="label">
            {text}
        </span>
    )
}));

const Box: FC<{ children: ReactNode }> = ({ children }) => <section>{children}</section>;
const Titled: FC<{ children: string }> = ({ children }) => <h2 title={children}>{children}</h2>;

describe('NativeTextTree', () => {
    afterEach(() => {
        cleanup();
        forceNativeTextEnabled(null);
    });

    it('labels every text-only element, inside components too, and keeps running text, form fields and component text', () => {
        forceNativeTextEnabled(true);

        render(
            <NativeTextTree>
                <div>
                    <label className="field">Gebruikersnaam</label>
                    <input defaultValue="value" />
                    <Box>
                        <a href="#x">Wachtwoord vergeten?</a>
                        {['Een', 'Twee'].map((item) => (
                            <span key={item}>{item}</span>
                        ))}
                    </Box>
                    <p>
                        Hallo <b>wereld</b>
                    </p>
                    <select defaultValue="nl">
                        <option value="nl">Nederlands</option>
                    </select>
                    <Titled>Nieuws</Titled>
                </div>
            </NativeTextTree>
        );

        expect(screen.getAllByTestId('label').map((node) => node.textContent)).toEqual(['Gebruikersnaam', 'Wachtwoord vergeten?', 'Een', 'Twee']);
        expect(screen.getByText('Gebruikersnaam')).toHaveAttribute('data-state', 'field|||');
        expect(screen.getByRole('option')).toHaveTextContent('Nederlands');
        expect(screen.getByRole('heading')).toHaveAttribute('title', 'Nieuws');
        expect(screen.getByRole('textbox')).toHaveValue('value');
    });

    it('returns the tree as it is while native text is off', () => {
        forceNativeTextEnabled(false);

        render(
            <NativeTextTree>
                <span>Inloggen</span>
            </NativeTextTree>
        );

        expect(screen.queryByTestId('label')).toBeNull();
        expect(screen.getByText('Inloggen')).toBeInTheDocument();
    });
});

describe('NativeTextTree child lists', () => {
    afterEach(() => {
        cleanup();
        forceNativeTextEnabled(null);
        vi.restoreAllMocks();
    });

    it('keeps the order and state of a rebuilt list and logs no key warning', () => {
        forceNativeTextEnabled(true);
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        const menu = (signs: boolean) => (
            <NativeTextTree>
                <div data-testid="menu">
                    {!signs && <span>Dansen</span>}
                    {signs && (
                        <>
                            {[1, 2].map((sign) => (
                                <b key={sign}>{`Bord ${sign}`}</b>
                            ))}
                            <span>Terug</span>
                        </>
                    )}
                    <input data-testid="field" defaultValue="" />
                </div>
            </NativeTextTree>
        );
        const { rerender } = render(menu(false));
        const field = screen.getByTestId('field') as HTMLInputElement;

        field.value = 'typed';
        rerender(menu(true));

        expect(screen.getAllByTestId('label').map((node) => node.textContent)).toEqual(['Bord 1', 'Bord 2', 'Terug']);
        expect((screen.getByTestId('field') as HTMLInputElement).value).toBe('typed');
        expect(error).not.toHaveBeenCalled();
    });
});
