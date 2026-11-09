import { loadGamedata } from '@octane/renderer';
import { useEffect, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue } from '../../api';
import { EMPTY_SOUNDBOARD_MANIFEST, normalizeSoundboardManifest, SoundboardManifest } from './soundboardManifest';

const DEFAULT_MANIFEST_URL = 'nitro-assets/gamedata/SoundData.json';

/**
 * Loads `gamedata/SoundData.json`, the asset pipeline's view of the soundboard.
 *
 * Shared because two unrelated surfaces need it — the pads themselves and the
 * Housekeeping editor — and neither should fetch it twice. It is loaded once
 * per session: the manifest ships with the assets, so it only changes when the
 * assets do.
 */
const useSoundboardManifestState = () => {
    const [manifest, setManifest] = useState<SoundboardManifest>(EMPTY_SOUNDBOARD_MANIFEST);
    const [loaded, setLoaded] = useState(false);

    // Broadcast handlers need the manifest synchronously, outside the render
    // that observed it.
    const manifestRef = useRef<SoundboardManifest>(EMPTY_SOUNDBOARD_MANIFEST);

    useEffect(() => {
        let cancelled = false;
        const url = GetConfigurationValue<string>('soundboard.manifest.url') || DEFAULT_MANIFEST_URL;

        const apply = (value: SoundboardManifest) => {
            if (cancelled) return;

            manifestRef.current = value;
            setManifest(value);
            setLoaded(true);
        };

        void loadGamedata<unknown>(url)
            .then((value) => apply(normalizeSoundboardManifest(value)))
            .catch(() => apply(EMPTY_SOUNDBOARD_MANIFEST));

        return () => {
            cancelled = true;
        };
    }, []);

    const classnames = useMemo(() => [...manifest.byClassname.keys()].sort(), [manifest]);

    return { manifest, manifestRef, classnames, loaded };
};

export const useSoundboardManifest = () => useSharedHook(useSoundboardManifestState);

registerSharedHook(useSoundboardManifestState);
