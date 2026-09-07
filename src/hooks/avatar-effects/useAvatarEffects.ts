import {
    AvatarEffectActivatedComposer,
    AvatarEffectActivatedEvent,
    AvatarEffectAddedEvent,
    AvatarEffectExpiredEvent,
    AvatarEffectSelectedEvent,
    AvatarEffectsEvent
} from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/**
 * One effect the user actually owns, as reported by the server.
 *
 * `secondsLeft` is only meaningful while the effect is running: the
 * emulator sends `elapsed + duration` for the active one and 0 for the
 * others, so it is stored verbatim and interpreted by the view.
 */
export interface OwnedAvatarEffect {
    type: number;
    subType: number;
    duration: number;
    inactiveCount: number;
    secondsLeft: number;
    isPermanent: boolean;
}

/**
 * Tracks the avatar effects the user owns.
 *
 * The server pushes the full list once, right after login
 * (`UserEffectsListComposer`, header 340), then deltas as effects are
 * won, activated or expire. This hook is registered as a shared source
 * so its subscriptions are alive from app start — a hook that only
 * mounted with the effects window would miss the login packet entirely.
 */
const useAvatarEffectsState = () => {
    const [effects, setEffects] = useState<OwnedAvatarEffect[]>([]);
    const [activeEffectType, setActiveEffectType] = useState(0);

    const upsertEffect = useCallback((effect: OwnedAvatarEffect) => {
        setEffects(prev => {
            const index = prev.findIndex(existing => existing.type === effect.type);

            if (index === -1) return [ ...prev, effect ];

            const next = [ ...prev ];

            next[index] = effect;

            return next;
        });
    }, []);

    useMessageEvent<AvatarEffectsEvent>(AvatarEffectsEvent, event => {
        const parsed = event.getParser().effects.map<OwnedAvatarEffect>(effect => ({
            type: effect.type,
            subType: effect.subType,
            duration: effect.duration,
            inactiveCount: effect.inactiveEffectsInInventory,
            secondsLeft: effect.secondsLeftIfActive,
            isPermanent: effect.isPermanent
        }));

        setEffects(parsed);

        // A running effect is the only one the server reports time for.
        const running = parsed.find(effect => !effect.isPermanent && effect.secondsLeft > 0);

        setActiveEffectType(running ? running.type : 0);
    });

    useMessageEvent<AvatarEffectAddedEvent>(AvatarEffectAddedEvent, event => {
        const parser = event.getParser();

        upsertEffect({
            type: parser.type,
            subType: parser.subType,
            duration: parser.duration,
            inactiveCount: 1,
            secondsLeft: 0,
            isPermanent: parser.isPermanent
        });
    });

    useMessageEvent<AvatarEffectExpiredEvent>(AvatarEffectExpiredEvent, event => {
        const type = event.getParser().type;

        setEffects(prev => prev.filter(effect => effect.type !== type));
        setActiveEffectType(prev => (prev === type ? 0 : prev));
    });

    useMessageEvent<AvatarEffectActivatedEvent>(AvatarEffectActivatedEvent, event => {
        const parser = event.getParser();

        setActiveEffectType(parser.type);

        setEffects(prev => prev.map(effect => (effect.type === parser.type
            ? { ...effect, duration: parser.duration, secondsLeft: parser.duration, isPermanent: parser.isPermanent }
            : effect)));
    });

    useMessageEvent<AvatarEffectSelectedEvent>(AvatarEffectSelectedEvent, event => {
        setActiveEffectType(event.getParser().type);
    });

    const activateEffect = useCallback((type: number) => {
        setActiveEffectType(type);
        SendMessageComposer(new AvatarEffectActivatedComposer(type));
    }, []);

    const isOwned = useCallback((type: number) => effects.some(effect => effect.type === type), [ effects ]);

    return { effects, activeEffectType, activateEffect, isOwned };
};

export const useAvatarEffects = () => useSharedHook(useAvatarEffectsState);

registerSharedHook(useAvatarEffectsState);
