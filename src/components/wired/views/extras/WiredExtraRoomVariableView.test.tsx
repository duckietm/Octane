import { cleanup, render } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setIntParams = vi.fn();
const setStringParam = vi.fn();
let trigger: { stringData: string; intData: number[]; contexts?: Array<{ type: number; value?: number }> } | null = null;
let save: (() => void) | null = null;

vi.mock('../../../../api', () => ({
    LocalizeText: (key: string, _params?: string[], values?: string[]) => (values?.length ? `${key}=${values.join(',')}` : key),
    WiredFurniType: { STUFF_SELECTION_OPTION_NONE: 0 }
}));
vi.mock('../../../../common', () => ({
    Text: ({ children }: PropsWithChildren) => <p>{children}</p>
}));
vi.mock('../../../../common/Radio', () => ({ Radio: () => null }));
vi.mock('../../../../layout', () => ({
    OctaneInput: (props: Record<string, unknown>) => <input {...props} />
}));
vi.mock('../../../../hooks', () => ({
    useWired: () => ({ trigger, setIntParams, setStringParam })
}));
vi.mock('./WiredExtraBaseView', () => ({
    WiredExtraBaseView: (props: PropsWithChildren<{ save: () => void }>) => {
        save = props.save;
        return <div>{props.children}</div>;
    }
}));

const { WiredExtraRoomVariableView } = await import('./WiredExtraRoomVariableView');

describe('WiredExtraRoomVariableView (AIR GlobalVariable)', () => {
    afterEach(cleanup);
    beforeEach(() => setIntParams.mockClear());

    it('orders name, inspection, availability and reads the value from the wired context', () => {
        trigger = { stringData: 'round', intData: [10], contexts: [{ type: 3, value: 42 }] };
        const { container } = render(<WiredExtraRoomVariableView />);

        const texts = [...container.querySelectorAll('p')].map((node) => node.textContent);
        expect(texts.indexOf('wiredfurni.params.variables.variable_name')).toBe(0);
        expect(texts.indexOf('wiredfurni.params.variables.inspection')).toBeLessThan(texts.indexOf('wiredfurni.params.variables.availability'));
        expect(texts).toContain('wiredfurni.params.variables.inspection.current_value=42');
    });

    it('saves [availability] only', () => {
        trigger = { stringData: 'round', intData: [11], contexts: [] };
        render(<WiredExtraRoomVariableView />);

        save?.();
        expect(setIntParams).toHaveBeenCalledWith([11]);
        expect(setStringParam).toHaveBeenCalledWith('round');
    });
});
