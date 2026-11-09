export interface BotSkillWindowAnchor {
    x: number;
    y: number;
    width: number;
}

/** BotSkillConfigurationViewBase.open + fitToScreen: centred on the bot, bottom on its head, kept fully on screen. */
export const GetBotSkillWindowPosition = (
    anchor: BotSkillWindowAnchor | null,
    width: number,
    height: number,
    viewportWidth: number,
    viewportHeight: number
): { x: number; y: number } => {
    const maxX = Math.max(0, viewportWidth - width);
    const maxY = Math.max(0, viewportHeight - height);

    if (!anchor) return { x: Math.round(maxX / 2), y: Math.round(maxY / 2) };

    const x = Math.round(anchor.x + anchor.width / 2 - width / 2);
    const y = Math.round(anchor.y - height);

    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
};
