import { GetConfigurationValue } from '../octane/GetConfigurationValue';

/**
 * Whether a new remembered login asks the server to keep its token in an HttpOnly cookie (`login.remember.cookie`).
 * Off by default: the server must support it and, when the client and the API are on different sites, send the
 * cookie with SameSite=None over https.
 */
export const isRememberCookieMode = (): boolean => GetConfigurationValue<boolean>('login.remember.cookie', false) === true;
