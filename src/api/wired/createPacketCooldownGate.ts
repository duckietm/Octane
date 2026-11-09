export const WIRED_SNAPSHOT_REQUEST_COOLDOWN_MS = 100;

export interface PacketCooldownGate {
    request: (send: () => void) => boolean;
}

/**
 * Leading-edge cooldown for a single packet header. Matches PacketManager
 * (`getRatelimit()` 50ms on wired snapshots) and stays under GameMessageRateLimit
 * (~10 packets of one header per second). Extra calls inside the window are dropped.
 */
export const createPacketCooldownGate = (cooldownMs: number = WIRED_SNAPSHOT_REQUEST_COOLDOWN_MS, now: () => number = Date.now): PacketCooldownGate => {
    let lastSentAt = Number.NEGATIVE_INFINITY;

    return {
        request: (send) => {
            const currentTime = now();

            if (currentTime - lastSentAt < cooldownMs) return false;

            lastSentAt = currentTime;
            send();

            return true;
        }
    };
};
