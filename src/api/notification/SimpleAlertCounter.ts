// Every simple alert raised so far, so a caller can tell whether a check it ran already showed one.
let simpleAlertCount = 0;

/** Called by the notification store for every simple alert it raises. */
export const countSimpleAlert = (): void => {
    simpleAlertCount += 1;
};

/** How many simple alerts were raised so far; compare two reads to see whether a call in between showed one. */
export const getSimpleAlertCount = (): number => simpleAlertCount;
