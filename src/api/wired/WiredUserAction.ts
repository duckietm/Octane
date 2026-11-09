/**
 * The official "user performs action" list (AIR WiredUserAction): the codes and their labels
 * `wiredfurni.params.action.<code>`. Sign and dance carry an extra in the string param: the sign id
 * ("4"), or "dance N".
 */
export const WIRED_USER_ACTION_SIGN = 10;
export const WIRED_USER_ACTION_DANCE = 11;

export const WIRED_USER_ACTIONS: { code: number; name: string }[] = [
    { code: 0, name: 'wave' },
    { code: 1, name: 'blow' },
    { code: 2, name: 'laugh' },
    { code: 3, name: 'respect' },
    { code: 4, name: 'awake' },
    { code: 5, name: 'sleep' },
    { code: 6, name: 'sit' },
    { code: 7, name: 'stand' },
    { code: 8, name: 'lay' },
    { code: WIRED_USER_ACTION_SIGN, name: 'sign' },
    { code: WIRED_USER_ACTION_DANCE, name: 'dance' }
];

export const WIRED_USER_ACTION_SIGNS = Array.from({ length: 18 }, (_, value) => value);
export const WIRED_USER_ACTION_DANCES = [ 1, 2, 3, 4 ];

export interface WiredUserActionChoice
{
    action: number;
    signFilter: boolean;
    signId: number;
    danceFilter: boolean;
    danceId: number;
}

/** onEditStart: the action from int[0], the extra filter on when the string param names one. */
export const readWiredUserAction = (intData: number[], stringData: string): WiredUserActionChoice =>
{
    const action = WIRED_USER_ACTIONS.some(entry => entry.code === intData?.[0]) ? intData[0] : 0;
    const extra = (stringData ?? '').trim();
    const choice: WiredUserActionChoice = { action, signFilter: false, signId: 0, danceFilter: false, danceId: 1 };

    if(!extra.length) return choice;

    if(action === WIRED_USER_ACTION_SIGN)
    {
        const sign = parseInt(extra, 10);

        if(sign >= 0 && sign <= 17) return { ...choice, signFilter: true, signId: sign };
    }

    if(action === WIRED_USER_ACTION_DANCE)
    {
        const dance = parseInt(extra.split(' ').pop() ?? '', 10);

        if(dance >= 1 && dance <= 4) return { ...choice, danceFilter: true, danceId: dance };
    }

    return choice;
};

/** readStringParamFromForm: the extra of a sign or dance with its filter on, else empty. */
export const wiredUserActionExtra = (choice: WiredUserActionChoice): string =>
{
    if(choice.action === WIRED_USER_ACTION_SIGN && choice.signFilter) return String(choice.signId);
    if(choice.action === WIRED_USER_ACTION_DANCE && choice.danceFilter) return `dance ${ choice.danceId }`;

    return '';
};
