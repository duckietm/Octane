export type BootStepRunner = <T>(key: string, task: () => Promise<T>) => Promise<T>;

/**
 * Runs each boot step once and shares it. A step that failed is dropped, so the next login retries it
 * while the steps that finished stay done (they register handlers and listeners, and must not run twice).
 */
export const createBootSteps = (): BootStepRunner => {
    const steps = new Map<string, Promise<unknown>>();

    return <T,>(key: string, task: () => Promise<T>): Promise<T> => {
        const existing = steps.get(key) as Promise<T>;

        if (existing) return existing;

        const promise = task();

        steps.set(key, promise);
        promise.catch(() => {
            if (steps.get(key) === promise) steps.delete(key);
        });

        return promise;
    };
};
