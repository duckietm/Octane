import { PlasmicCanvasHost } from '@plasmicapp/loader-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/habbo/HabboTheme.css';
import '../css/index.css';
import '../css/habbo/HabboSkin.css';
import '../css/common/Buttons.css';
import './plasmicLoader';

// App host for Plasmic Studio. In Studio: Project settings → App host URL →
// http://localhost:5173/plasmic-host.html
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <PlasmicCanvasHost />
    </StrictMode>
);
