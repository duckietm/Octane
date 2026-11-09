import { describe, expect, it } from 'vitest';
import { canConnectWiredLink, isValidWiredLinkName, mergeWiredLinkNetworks, sortWiredLinkNetworks } from './WiredLink';
import {
    emptyReceiveRow,
    emptySendRow,
    LINK_RECEIVE_VARIABLE,
    LINK_SEND_MESSAGE,
    LINK_SEND_VARIABLE_VALUE,
    linkKeyError,
    linkReceiveError,
    linkSendError,
    normalizeLinkKey,
    readLinkReceive,
    readLinkSend,
    writeLinkReceive,
    writeLinkSend
} from './WiredLinkDataframe';

const network = (id: string, name: string, linkedInCurrentRoom: boolean) => ({ id, name, connectionCount: 1, linkedInCurrentRoom });

describe('WIRED Link window helpers', () =>
{
    it('follows the official name and connect rules', () =>
    {
        expect(isValidWiredLinkName('  ')).toBe(false);
        expect(isValidWiredLinkName('x'.repeat(256))).toBe(false);
        expect(isValidWiredLinkName('Games')).toBe(true);

        const networks = [ network('1', 'A', true), network('2', 'B', false) ];

        expect(canConnectWiredLink(networks, '0', '1')).toBe(true);
        expect(canConnectWiredLink(networks, '1', '1')).toBe(true);
        expect(canConnectWiredLink(networks, '1', '0')).toBe(false);
        expect(canConnectWiredLink(networks, '2', '0')).toBe(true);
        expect(canConnectWiredLink(networks, '9', '0')).toBe(false);
    });

    it('lists linked networks first, then by name, and merges results', () =>
    {
        expect(sortWiredLinkNetworks([ network('1', 'b', false), network('2', 'a', false), network('3', 'z', true) ]).map(entry => entry.id)).toEqual([ '3', '2', '1' ]);
        expect(mergeWiredLinkNetworks([ network('1', 'a', false), network('2', 'b', false) ], '1', [ network('2', 'c', true), network('3', 'd', false) ]).map(entry => entry.name)).toEqual([ 'c', 'd' ]);
    });
});

describe('WIRED Link dataframe codec', () =>
{
    it('normalizes keys like AIR', () =>
    {
        expect(normalizeLinkKey('  My Key ')).toBe('my_key');
        expect(linkKeyError('')).toBe('wiredfurni.error.link.key_length');
        expect(linkKeyError('a-b')).toBe('wiredfurni.error.variables.name_syntax');
    });

    it('round-trips the send storage', () =>
    {
        const rows = [ { ...emptySendRow(), key: 'Score', literal: 5 }, { ...emptySendRow(), key: 'msg', mode: LINK_SEND_MESSAGE, text: 'hi' }, { ...emptySendRow(), key: 'v', mode: LINK_SEND_VARIABLE_VALUE, variableId: 'custom:9', target: -20 } ];
        const stored = writeLinkSend(rows);

        expect(stored.intParams).toHaveLength(37);
        expect(stored.variableIds).toHaveLength(12);
        expect(stored.stringParam).toBe('[["score",""],["msg","hi"],["v",""]]');

        const read = readLinkSend(stored.intParams, stored.stringParam, stored.variableIds);

        expect(read.map(row => row.key)).toEqual([ 'score', 'msg', 'v' ]);
        expect(read[0].literal).toBe(5);
        expect(read[2].variableId).toBe('custom:9');
        expect(read[2].target).toBe(-20);
        expect(readLinkSend([ 1, ...new Array(36).fill(0) ], '[]', [])).toBeNull();
    });

    it('round-trips the receive storage', () =>
    {
        const rows = [ { ...emptyReceiveRow(), key: 'score', placeholder: 'Points' }, { ...emptyReceiveRow(), key: 'v', kind: LINK_RECEIVE_VARIABLE, variableId: 'custom:4' } ];
        const stored = writeLinkReceive(rows);

        expect(stored.intParams).toEqual([ 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]);
        expect(stored.stringParam).toBe('[["score","points"],["v",""]]');
        expect(readLinkReceive(stored.intParams, stored.stringParam, stored.variableIds)[1].variableId).toBe('custom:4');
    });

    it('validates like the official editors', () =>
    {
        expect(linkSendError([ { ...emptySendRow(), key: 'a' }, { ...emptySendRow(), key: 'A' } ])?.key).toBe('wiredfurni.error.variables.name_uniq');
        expect(linkSendError([ { ...emptySendRow(), key: 'a', mode: LINK_SEND_VARIABLE_VALUE } ])?.key).toBe('wiredfurni.params.link.select_source_variable');
        expect(linkReceiveError([ { ...emptyReceiveRow(), key: 'a', placeholder: 'trigger_text' } ])?.key).toBe('wiredfurni.error.placeholder.reserved');
        expect(linkReceiveError([ { ...emptyReceiveRow(), key: 'a', placeholder: 'p' }, { ...emptyReceiveRow(), key: 'b', placeholder: 'P' } ])?.key).toBe('wiredfurni.error.link.destination_conflict');
        expect(linkReceiveError([ { ...emptyReceiveRow(), key: 'a', placeholder: 'p' } ])).toBeNull();
    });
});
