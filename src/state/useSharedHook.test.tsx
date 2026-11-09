import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { registerSharedHook, SharedHookRegistry, useSharedHook } from './useSharedHook';

describe('useSharedHook', () => {
    it('runs the source hook once and shares its Zustand-backed snapshot', async () => {
        const mounted = vi.fn();

        const useCounterSource = () => {
            const [count, setCount] = useState(0);

            useEffect(() => {
                mounted();
            }, []);

            return { count, setCount };
        };

        const Counter = ({ label }: { label: string }) => {
            const { count, setCount } = useSharedHook(useCounterSource);

            return (
                <button data-testid={label} onClick={() => setCount((value) => value + 1)}>
                    {count}
                </button>
            );
        };

        registerSharedHook(useCounterSource);

        const view = render(
            <SharedHookRegistry fallback={<span>loading</span>}>
                <span>shell</span>
            </SharedHookRegistry>
        );

        await waitFor(() => expect(mounted).toHaveBeenCalledTimes(1));

        view.rerender(
            <SharedHookRegistry fallback={<span>loading</span>}>
                <Counter label="first" />
                <Counter label="second" />
            </SharedHookRegistry>
        );

        expect(screen.queryByText('loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('first')).toHaveTextContent('0');
        expect(screen.getByTestId('second')).toHaveTextContent('0');
        expect(mounted).toHaveBeenCalledTimes(1);

        act(() => screen.getByTestId('first').click());

        expect(screen.getByTestId('first')).toHaveTextContent('1');
        expect(screen.getByTestId('second')).toHaveTextContent('1');
    });
});
