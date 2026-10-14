import { PlasmicComponent, PlasmicRootProvider } from '@plasmicapp/loader-react';
import { FC, useEffect, useState } from 'react';
import { isPlasmicConfigured, PLASMIC } from './plasmicLoader';

export interface PlasmicViewProps {
    /** Component name or path as shown in Plasmic Studio. */
    component: string;
    componentProps?: Record<string, unknown>;
}

// Renders a Plasmic-designed component. Returns null while loading or when Plasmic is
// not configured, so it is safe to drop next to an existing hand-written view as a
// progressive replacement.
export const PlasmicView: FC<PlasmicViewProps> = ({ component, componentProps }) => {
    const [ prefetchedData, setPrefetchedData ] = useState<any>(null);

    useEffect(() => {
        if (!isPlasmicConfigured) return;

        let cancelled = false;

        PLASMIC.fetchComponentData(component)
            .then((data) => !cancelled && setPrefetchedData(data))
            .catch(() => {});

        return () => { cancelled = true; };
    }, [ component ]);

    if (!isPlasmicConfigured || !prefetchedData) return null;

    return (
        <PlasmicRootProvider loader={PLASMIC} prefetchedData={prefetchedData}>
            <PlasmicComponent component={component} componentProps={componentProps} />
        </PlasmicRootProvider>
    );
};
