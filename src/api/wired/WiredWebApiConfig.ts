import { GetConfigurationValue } from '../octane';
import { normalizeWebApiBaseUrl, resolveWebApiDocsUrl, resolveWebApiHotels, WebApiHotel, webApiBaseFromSocketUrl } from './WiredWebApi';

/** `wired.webapi.url`, else the websocket's host and port. */
export const GetDefaultWebApiBaseUrl = (): string | null =>
    normalizeWebApiBaseUrl(GetConfigurationValue<string>('wired.webapi.url', '')) ?? webApiBaseFromSocketUrl(GetConfigurationValue<string>('socket.url', ''));

/** `wired.webapi.hotels` (`[{ name, url }]`), defaulting to the current hotel. */
export const GetWebApiHotels = (): WebApiHotel[] => {
    const base = GetDefaultWebApiBaseUrl();
    let name = base ?? '';

    try {
        if (base) name = new URL(base).host;
    } catch {}

    return resolveWebApiHotels(GetConfigurationValue<unknown>('wired.webapi.hotels', null), base ? { name, url: base } : null);
};

/** `wired.webapi.docs_url`, default `<api base>/api/public/api-docs/`. */
export const GetWebApiDocsUrl = (): string => resolveWebApiDocsUrl(GetConfigurationValue<string>('wired.webapi.docs_url', ''), GetDefaultWebApiBaseUrl());
