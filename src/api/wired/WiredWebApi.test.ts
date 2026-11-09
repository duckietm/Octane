import { describe, expect, it } from 'vitest';
import {
    buildWebApiBoxParams,
    canAllowBulkDelete,
    expandLocalizedText,
    isWebApiBoxClassName,
    parseWebApiBoxParams,
    resolveWebApiDocsUrl,
    resolveWebApiHotels,
    webApiBaseFromSocketUrl
} from './WiredWebApi';

describe('web api box params', () => {
    it('reads both keys and the bulk delete flag', () => {
        expect(parseWebApiBoxParams('READ\tWRITE', [1])).toEqual({ readKey: 'READ', writeKey: 'WRITE', bulkDelete: true });
    });

    it('drops bulk delete without a write key', () => {
        expect(parseWebApiBoxParams('READ\t', [1])).toEqual({ readKey: 'READ', writeKey: '', bulkDelete: false });
        expect(parseWebApiBoxParams('', [])).toEqual({ readKey: '', writeKey: '', bulkDelete: false });
        expect(parseWebApiBoxParams(null, null)).toEqual({ readKey: '', writeKey: '', bulkDelete: false });
    });

    it('writes the string and int params the server expects', () => {
        expect(buildWebApiBoxParams({ readKey: 'READ', writeKey: 'WRITE', bulkDelete: true })).toEqual({ stringParam: '*\t*', intParams: [1] });
        expect(buildWebApiBoxParams({ readKey: '', writeKey: 'WRITE', bulkDelete: false })).toEqual({ stringParam: '\t*', intParams: [0] });
    });

    it('never saves bulk delete without a write key', () => {
        expect(canAllowBulkDelete('')).toBe(false);
        expect(canAllowBulkDelete('WRITE')).toBe(true);
        expect(buildWebApiBoxParams({ readKey: 'READ', writeKey: '', bulkDelete: true }).intParams).toEqual([0]);
    });

    it('never puts a key in the save packet', () => {
        const built = buildWebApiBoxParams({ readKey: 'a'.repeat(43), writeKey: 'b'.repeat(43), bulkDelete: true });

        expect(built.stringParam).not.toContain('a'.repeat(43));
        expect(built.stringParam).not.toContain('b'.repeat(43));
        expect(parseWebApiBoxParams(built.stringParam, built.intParams).bulkDelete).toBe(true);
    });

    it('knows the box by its classname', () => {
        expect(isWebApiBoxClassName('wf_xtra_var_web_api')).toBe(true);
        expect(isWebApiBoxClassName('WF_XTRA_VAR_WEB_API')).toBe(true);
        expect(isWebApiBoxClassName('wf_xtra_var_fx_user')).toBe(false);
        expect(isWebApiBoxClassName(undefined)).toBe(false);
    });
});

describe('expandLocalizedText', () => {
    const texts: Record<string, string> = { 'wiredfurni.danger.1.change.confirm.title': 'Are you sure?' };
    const resolve = (key: string) => texts[key] ?? null;

    it('resolves a text that points at another text', () => {
        expect(expandLocalizedText('${wiredfurni.danger.1.change.confirm.title}', resolve)).toBe('Are you sure?');
    });

    it('keeps an unknown reference and turns escaped newlines into real ones', () => {
        expect(expandLocalizedText('${missing.key}', resolve)).toBe('${missing.key}');
        expect(expandLocalizedText('one\\ntwo', resolve)).toBe('one\ntwo');
    });
});

describe('web api hotel configuration', () => {
    it('derives the api base from the websocket url', () => {
        expect(webApiBaseFromSocketUrl('wss://game.example.com:2096')).toBe('https://game.example.com:2096');
        expect(webApiBaseFromSocketUrl('ws://localhost:2096/ws')).toBe('http://localhost:2096');
        expect(webApiBaseFromSocketUrl('ftp://nope')).toBeNull();
        expect(webApiBaseFromSocketUrl('')).toBeNull();
    });

    it('keeps configured http(s) hotels and falls back to the current one', () => {
        const fallback = { name: 'Here', url: 'https://here.example:2096' };

        expect(
            resolveWebApiHotels(
                [{ name: 'Main', url: 'https://main.example/' }, { name: 'Bad', url: 'javascript:alert(1)' }, { url: 'https://user:pw@x.example' }, 'nope'],
                fallback
            )
        ).toEqual([{ name: 'Main', url: 'https://main.example' }]);
        expect(resolveWebApiHotels(null, fallback)).toEqual([{ name: 'Here', url: 'https://here.example:2096' }]);
        expect(resolveWebApiHotels([], null)).toEqual([]);
    });

    it('links the docs under the api base unless configured', () => {
        expect(resolveWebApiDocsUrl('', 'https://here.example:2096')).toBe('https://here.example:2096/api/public/api-docs/');
        expect(resolveWebApiDocsUrl('https://docs.example/api/', 'https://here.example')).toBe('https://docs.example/api/');
        expect(resolveWebApiDocsUrl('', null)).toBe('');
    });
});
