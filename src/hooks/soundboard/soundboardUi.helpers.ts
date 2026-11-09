export const getRemainingCooldownSeconds = (cooldownUntilMs: number, nowMs: number): number => {
    if (cooldownUntilMs <= nowMs) return 0;

    return Math.ceil((cooldownUntilMs - nowMs) / 1_000);
};

export const shouldStartOwnCooldown = (actorUserId: number, ownUserId: number, cooldownSeconds: number): boolean =>
    cooldownSeconds > 0 && actorUserId > 0 && actorUserId === ownUserId;
