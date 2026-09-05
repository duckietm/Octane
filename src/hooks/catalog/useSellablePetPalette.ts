import { GetSellablePetPalettesComposer, SellablePetPalettesMessageEvent } from '@octane/renderer';
import { useCallback, useEffect, useState } from 'react';
import { CatalogPetPalette, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

const palettesCache = new Map<string, CatalogPetPalette>();

export const useSellablePetPalette = (breed: string, options: { enabled?: boolean } = {}): { data: CatalogPetPalette | null } => {
    const enabled = (options.enabled ?? true) && !!breed;
    const [data, setData] = useState<CatalogPetPalette | null>(() => (breed ? (palettesCache.get(breed) ?? null) : null));
    const [trackedBreed, setTrackedBreed] = useState(breed);

    if (trackedBreed !== breed) {
        setTrackedBreed(breed);
        setData(breed ? (palettesCache.get(breed) ?? null) : null);
    }

    const handler = useCallback(
        (event: SellablePetPalettesMessageEvent) => {
            const parser = event.getParser();
            if (!parser || parser.productCode !== breed) return;

            const palette = new CatalogPetPalette(parser.productCode, parser.palettes.slice());
            palettesCache.set(breed, palette);
            setData(palette);
        },
        [breed]
    );

    useMessageEvent<SellablePetPalettesMessageEvent>(SellablePetPalettesMessageEvent, handler);

    useEffect(() => {
        if (!enabled) return;
        if (palettesCache.has(breed)) return;

        SendMessageComposer(new GetSellablePetPalettesComposer(breed));
    }, [enabled, breed]);

    return { data };
};
