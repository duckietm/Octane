import { initPlasmicLoader } from '@plasmicapp/loader-react';
import { registerOctaneComponents } from './registerComponents';

// Configured through Vite env vars (see .env.example). Without a project id the
// integration stays dormant: nothing in the game client imports this module.
const projectId = import.meta.env.VITE_PLASMIC_PROJECT_ID as string | undefined;
const projectToken = import.meta.env.VITE_PLASMIC_PROJECT_TOKEN as string | undefined;

export const isPlasmicConfigured = Boolean(projectId && projectToken);

export const PLASMIC = initPlasmicLoader({
    projects: [{ id: projectId ?? '', token: projectToken ?? '' }],
    // Draft content only in dev; production serves the published version.
    preview: import.meta.env.DEV
});

registerOctaneComponents((component, meta) => PLASMIC.registerComponent(component, meta));
