/// <reference types="react-scripts" />
declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.gif' {
    const src: string;
    export default src;
}

declare module '*.jpg' {
    const src: string;
    export default src;
}

declare module '*.jpeg' {
    const src: string;
    export default src;
}

declare module '*.svg' {
    const src: string;
    export default src;
}

declare module '*.webp' {
    const src: string;
    export default src;
}

declare module '*.css';
declare module '*.scss';
declare module '*.sass';

interface Window {
    OctaneConfig?: Record<string, unknown>;
    OctaneSecureApiUrl?: string;
}

interface ImportMeta {
    glob: (pattern: string, options?: { eager?: boolean; import?: string }) => Record<string, string>;
}
