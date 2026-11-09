/**
 * The furni the clock wired (clock trigger, counter time condition, control and adjust clock) can pick:
 * the game counter. The client's furnidata has no interaction type, so the counter's furni names count
 * too (wf_upcounter1, wf_upcounter2, ...); the emulator checks the interaction itself.
 */
export const WIRED_CLOCK_FURNI_TYPES = ['game_upcounter', 'wf_upcounter*', 'wf_game_upcounter*', 'game_upcounter*'];
