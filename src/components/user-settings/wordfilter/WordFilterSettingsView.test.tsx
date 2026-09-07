/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    handlers: new Map<string, (event: any) => void>(),
    linkTracker: null as null | { linkReceived: (url: string) => void },
    sendMessage: vi.fn()
}));

vi.mock('@octane/renderer', () => {
    class ComposerStub {
        public readonly data: unknown[];
        constructor(...args: unknown[]) {
            this.data = args;
        }
    }
    class MessageEventStub {
        public getParser(): any {
            return null;
        }
    }

    return {
        AddCustomFilterWordMessageComposer: class extends ComposerStub {},
        AddLinkEventTracker: (tracker: { linkReceived: (url: string) => void }) => {
            mocks.linkTracker = tracker;
        },
        CustomFilterResultEvent: class extends MessageEventStub {},
        GetCustomFilterMessageComposer: class extends ComposerStub {},
        ModifyCustomFilterResultEvent: class extends MessageEventStub {},
        RemoveCustomFilterWordMessageComposer: class extends ComposerStub {},
        RemoveLinkEventTracker: () => undefined
    };
});

vi.mock('../../../api', () => ({
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    SendMessageComposer: mocks.sendMessage
}));

vi.mock('../../../hooks', () => ({
    useMessageEvent: (eventType: any, handler: (event: any) => void) => mocks.handlers.set(eventType.name, handler)
}));

vi.mock('../../../common', () => ({
    DraggableWindow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

import { AddCustomFilterWordMessageComposer, GetCustomFilterMessageComposer, RemoveCustomFilterWordMessageComposer } from '@octane/renderer';
import { WordFilterSettingsView } from './WordFilterSettingsView';

const open = () => act(() => mocks.linkTracker?.linkReceived('word-filter/show'));

const dispatch = (eventName: string, parser: Record<string, unknown>) => act(() => mocks.handlers.get(eventName)?.({ getParser: () => parser }));

const sentComposers = () => mocks.sendMessage.mock.calls.map(([composer]) => composer);

describe('WordFilterSettingsView', () => {
    beforeEach(() => {
        mocks.sendMessage.mockClear();
        mocks.handlers.clear();
        mocks.linkTracker = null;
    });

    afterEach(cleanup);

    it('stays hidden until the link opens it, then asks the server for the list', () => {
        render(<WordFilterSettingsView />);

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(mocks.sendMessage).not.toHaveBeenCalled();

        open();

        expect(screen.getByRole('dialog', { name: 'Word filter' })).toBeInTheDocument();
        expect(sentComposers()[0]).toBeInstanceOf(GetCustomFilterMessageComposer);
    });

    it('lists the words the server sends and applies add / remove results', () => {
        render(<WordFilterSettingsView />);
        open();

        dispatch('CustomFilterResultEvent', { words: ['pippo', 'pluto'] });
        expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual(['pippo', 'pluto']);

        dispatch('ModifyCustomFilterResultEvent', { result: 1, word: 'topolino' });
        expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual(['pippo', 'pluto', 'topolino']);

        dispatch('ModifyCustomFilterResultEvent', { result: 3, word: 'pluto' });
        expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual(['pippo', 'topolino']);
    });

    it('sends the typed word on Add and clears the input, ignoring blanks and duplicates', () => {
        render(<WordFilterSettingsView />);
        open();
        dispatch('CustomFilterResultEvent', { words: ['pippo'] });
        mocks.sendMessage.mockClear();

        const input = screen.getByRole('textbox') as HTMLInputElement;
        const addButton = screen.getByRole('button', { name: 'Add' });

        fireEvent.click(addButton);
        fireEvent.change(input, { target: { value: 'Pippo' } });
        fireEvent.click(addButton);
        expect(mocks.sendMessage).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: ' pluto ' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        const composer = sentComposers()[0];
        expect(composer).toBeInstanceOf(AddCustomFilterWordMessageComposer);
        expect(composer.data).toEqual(['pluto']);
        expect(input.value).toBe('');
    });

    it('removes the selected row only, and the Back button closes the window', () => {
        render(<WordFilterSettingsView />);
        open();
        dispatch('CustomFilterResultEvent', { words: ['pippo', 'pluto'] });
        mocks.sendMessage.mockClear();

        const removeButton = screen.getByRole('button', { name: 'Remove' });

        fireEvent.click(removeButton);
        expect(mocks.sendMessage).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('option', { name: 'pluto' }));
        expect(screen.getByRole('option', { name: 'pluto' })).toHaveAttribute('aria-selected', 'true');

        fireEvent.click(removeButton);
        const composer = sentComposers()[0];
        expect(composer).toBeInstanceOf(RemoveCustomFilterWordMessageComposer);
        expect(composer.data).toEqual(['pluto']);

        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.queryByRole('dialog')).toBeNull();
    });
});
