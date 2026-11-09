export type RegistrationDraftStep = 'credentials' | 'avatar' | 'room';
export type RegistrationDraftGender = 'M' | 'F';

export interface RegistrationDraftPartSelection {
    partId: number;
    colors: number[];
}

export interface RegistrationDraft {
    step: RegistrationDraftStep;
    email: string;
    username: string;
    gender: RegistrationDraftGender;
    selection: Record<string, RegistrationDraftPartSelection>;
    selectedTemplateId: number | null;
    updatedAt: number;
}

export const REGISTRATION_DRAFT_STORAGE_KEY = 'nitro.registration.draft.v1';
export const REGISTRATION_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ALLOWED_AVATAR_SET_TYPES = new Set(['hd', 'hr', 'ha', 'he', 'ea', 'fa', 'ch', 'cp', 'cc', 'ca', 'lg', 'sh', 'wa']);

const isDraftStep = (value: unknown): value is RegistrationDraftStep => value === 'credentials' || value === 'avatar' || value === 'room';

const sanitizeSelection = (value: unknown): RegistrationDraft['selection'] => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    const selection: RegistrationDraft['selection'] = {};
    for (const [setType, part] of Object.entries(value)) {
        if (!ALLOWED_AVATAR_SET_TYPES.has(setType) || !part || typeof part !== 'object' || Array.isArray(part)) continue;

        const candidate = part as { partId?: unknown; colors?: unknown };
        if (!Number.isInteger(candidate.partId) || (candidate.partId as number) < 0) continue;

        const colors = Array.isArray(candidate.colors)
            ? candidate.colors.filter((color): color is number => Number.isInteger(color) && (color as number) >= 0).slice(0, 4)
            : [];

        selection[setType] = { partId: candidate.partId as number, colors };
    }

    return selection;
};

export const clearRegistrationDraft = (): void => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.removeItem(REGISTRATION_DRAFT_STORAGE_KEY);
    } catch {}
};

export const loadRegistrationDraft = (): RegistrationDraft | null => {
    if (typeof window === 'undefined') return null;

    try {
        const raw = window.localStorage.getItem(REGISTRATION_DRAFT_STORAGE_KEY);
        if (!raw) return null;

        const candidate = JSON.parse(raw) as Partial<RegistrationDraft>;
        const updatedAt = Number(candidate.updatedAt);
        if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > REGISTRATION_DRAFT_MAX_AGE_MS || !isDraftStep(candidate.step)) {
            clearRegistrationDraft();
            return null;
        }

        const gender: RegistrationDraftGender = candidate.gender === 'M' ? 'M' : 'F';
        const selectedTemplateId =
            Number.isInteger(candidate.selectedTemplateId) && (candidate.selectedTemplateId as number) >= 0 ? (candidate.selectedTemplateId as number) : null;

        return {
            step: candidate.step,
            email: typeof candidate.email === 'string' ? candidate.email.slice(0, 120) : '',
            username: typeof candidate.username === 'string' ? candidate.username.slice(0, 16) : '',
            gender,
            selection: sanitizeSelection(candidate.selection),
            selectedTemplateId,
            updatedAt
        };
    } catch {
        clearRegistrationDraft();
        return null;
    }
};

export const saveRegistrationDraft = (draft: Omit<RegistrationDraft, 'updatedAt'>): void => {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(REGISTRATION_DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, updatedAt: Date.now() } satisfies RegistrationDraft));
    } catch {}
};
