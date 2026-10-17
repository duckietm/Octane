import { ReactNode, Suspense, useLayoutEffect, useSyncExternalStore } from 'react';
import { useStore } from 'zustand';
import { createStore, StoreApi } from 'zustand/vanilla';

type SourceHook<T> = () => T;

interface SharedHookResource<T> {
    Host: () => null;
    ready: boolean;
    readyPromise: Promise<void>;
    request(): void;
    store: StoreApi<T>;
}

const resources = new WeakMap<SourceHook<unknown>, SharedHookResource<unknown>>();
const requestedResources = new Set<SharedHookResource<unknown>>();
const registryListeners = new Set<() => void>();
let registryVersion = 0;
let notificationQueued = false;

const emitRegistryChange = () => {
    notificationQueued = false;
    registryVersion++;
    registryListeners.forEach((listener) => listener());
};

const queueRegistryChange = () => {
    if (notificationQueued) return;

    notificationQueued = true;
    queueMicrotask(emitRegistryChange);
};

const subscribeRegistry = (listener: () => void) => {
    registryListeners.add(listener);

    return () => registryListeners.delete(listener);
};

const getRegistrySnapshot = () => registryVersion;

const createSharedHookResource = <T,>(useSourceHook: SourceHook<T>): SharedHookResource<T> => {
    let resolveReady: () => void;
    const readyPromise = new Promise<void>((resolve) => {
        resolveReady = resolve;
    });
    const store = createStore<T>(() => ({}) as T);
    const resource: SharedHookResource<T> = {
        Host: null,
        ready: false,
        readyPromise,
        request: () => {
            if (requestedResources.has(resource)) return;

            requestedResources.add(resource);
            queueRegistryChange();
        },
        store
    };

    const SharedHookHost = () => {
        const snapshot = useSourceHook();

        useLayoutEffect(() => {
            store.setState(snapshot, true);

            if (!resource.ready) {
                resource.ready = true;
                resolveReady();
            }
        }, [snapshot]);

        return null;
    };
    resource.Host = SharedHookHost;

    return resource;
};

const getSharedHookResource = <T,>(useSourceHook: SourceHook<T>): SharedHookResource<T> => {
    let resource = resources.get(useSourceHook) as SharedHookResource<T>;

    if (!resource) {
        resource = createSharedHookResource(useSourceHook);
        resources.set(useSourceHook, resource);
    }

    return resource;
};

/**
 * Register a shared source while its module is evaluated. The registry can
 * then mount the source before a feature consumes it, avoiding a full-app
 * Suspense fallback when that feature is opened for the first time.
 */
export const registerSharedHook = <T,>(useSourceHook: SourceHook<T>) => {
    getSharedHookResource(useSourceHook).request();
};

export const useSharedHook = <T,>(useSourceHook: SourceHook<T>): T => {
    const resource = getSharedHookResource(useSourceHook);

    resource.request();

    if (!resource.ready) throw resource.readyPromise;

    return useStore(resource.store);
};

export const SharedHookRegistry = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => {
    useSyncExternalStore(subscribeRegistry, getRegistrySnapshot, getRegistrySnapshot);

    return (
        <>
            {[...requestedResources].map((resource, index) => {
                const Host = resource.Host;

                return (
                    <Suspense fallback={null} key={index}>
                        <Host />
                    </Suspense>
                );
            })}
            <Suspense fallback={fallback}>{children}</Suspense>
        </>
    );
};
