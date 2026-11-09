import { useReducer, useRef } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { initialMessengerState, messengerReducer } from '../../../api';

const useMessengerStoreState = () =>
{
    const [ state, dispatch ] = useReducer(messengerReducer, initialMessengerState);
    const stateRef = useRef(state);
    stateRef.current = state;
    return { state, dispatch, getState: () => stateRef.current };
};

export const useMessengerStore = () => useSharedHook(useMessengerStoreState);

registerSharedHook(useMessengerStoreState);
