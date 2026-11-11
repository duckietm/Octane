/** A starter room the first-login setup offers (FirstLoginSetupParser's template). */
export interface FirstLoginSetupTemplate {
    templateId: number;
    title: string;
    description: string;
    thumbnail: string;
}

/** The answer "no room": the offer ends and the user makes their own rooms. */
export const FIRST_LOGIN_NO_ROOM = 0;

/** The templates worth showing: a real id and a title, each id once. */
export const usableFirstLoginTemplates = (templates: ReadonlyArray<FirstLoginSetupTemplate> | null | undefined): FirstLoginSetupTemplate[] => {
    const seen = new Set<number>();
    const usable: FirstLoginSetupTemplate[] = [];

    for (const template of templates ?? []) {
        if (!template || !Number.isInteger(template.templateId) || template.templateId <= 0) continue;
        if (seen.has(template.templateId)) continue;

        seen.add(template.templateId);
        usable.push({
            templateId: template.templateId,
            title: template.title?.trim() || `#${template.templateId}`,
            description: template.description?.trim() ?? '',
            thumbnail: template.thumbnail?.trim() ?? ''
        });
    }

    return usable;
};

/** The template id to send: the selection when it is one of the offered rooms, otherwise "no room". */
export const firstLoginAnswer = (selectedTemplateId: number | null, templates: ReadonlyArray<FirstLoginSetupTemplate>): number => {
    if (selectedTemplateId === null) return FIRST_LOGIN_NO_ROOM;

    return templates.some((template) => template.templateId === selectedTemplateId) ? selectedTemplateId : FIRST_LOGIN_NO_ROOM;
};
