export const CONTRACT_DIR_PAY = 0;
export const CONTRACT_DIR_RECEIVE = 1;

export const CONTRACT_KIND_CURRENCY = 0;
export const CONTRACT_KIND_FURNI = 1;

/**
 * Opens the alternatives format. A payload written before it exists starts with a plain term count,
 * which can never be negative, so the two shapes cannot be confused for one another.
 */
export const CONTRACT_RULES_FORMAT = -1;

/** Matches the ceilings the contract enforces on save. */
export const CONTRACT_MAX_RULES = 8;
export const CONTRACT_MAX_NODES = 8;

const NODE_STRIDE = 5;
const LEGACY_STRIDE = 3;

export interface ContractTermRow {
    direction: number;
    kind: number;
    currencyType: number;
    wallItem: boolean;
    baseItemId: number;
    amount: number;
    /** Only meaningful for a wall item, which cannot be identified by base item id alone. */
    posterId?: string;
}

/**
 * What a contract asks for and hands back.
 *
 * `giveRules` are alternatives — any one of them satisfies the contract — and the rows inside one
 * alternative all have to be met together. `getRule` is what comes back, all of it.
 */
export interface ContractRules {
    giveRules: ContractTermRow[][];
    getRule: ContractTermRow[];
}

export const emptyRow = (direction: number): ContractTermRow => ({
    direction,
    kind: CONTRACT_KIND_CURRENCY,
    currencyType: -1,
    wallItem: false,
    baseItemId: 0,
    amount: 0,
});

const readNode = (data: number[], base: number, direction: number): ContractTermRow => {
    const kind = data[base];
    const amount = Math.max(0, data[base + 4]);

    return kind === CONTRACT_KIND_FURNI
        ? { direction, kind, currencyType: 0, wallItem: data[base + 2] !== 0, baseItemId: Math.max(0, data[base + 3]), amount }
        : { direction, kind: CONTRACT_KIND_CURRENCY, currencyType: data[base + 1], wallItem: false, baseItemId: 0, amount };
};

/**
 * Read a contract the server pushed. Understands both the alternatives format and the single flat
 * list a contract saved before it carries, which reads back as one alternative — what it meant.
 */
export const parseContractRules = (intData: number[] = [], stringData = ''): ContractRules => {
    const data = intData ?? [];

    if (data.length && data[0] === CONTRACT_RULES_FORMAT) return parseRulesFormat(data, stringData);

    return parseLegacy(data, stringData);
};

const parseRulesFormat = (data: number[], stringData: string): ContractRules => {
    const giveRules: ContractTermRow[][] = [];
    const getRule: ContractTermRow[] = [];
    const posters = parsePosters(stringData);
    let flatIndex = 0;

    const ruleCount = Math.max(0, Math.min(CONTRACT_MAX_RULES, data[1] ?? 0));
    let cursor = 2;

    for (let rule = 0; rule < ruleCount; rule++) {
        if (cursor >= data.length) break;

        const nodeCount = Math.max(0, Math.min(CONTRACT_MAX_NODES, data[cursor++]));
        const nodes: ContractTermRow[] = [];

        for (let node = 0; node < nodeCount; node++) {
            if (cursor + NODE_STRIDE > data.length) break;

            const row = readNode(data, cursor, CONTRACT_DIR_PAY);
            cursor += NODE_STRIDE;
            applyPoster(row, posters, flatIndex++);
            nodes.push(row);
        }

        giveRules.push(nodes);
    }

    if (cursor < data.length) {
        const rewardCount = Math.max(0, Math.min(CONTRACT_MAX_NODES, data[cursor++]));

        for (let node = 0; node < rewardCount; node++) {
            if (cursor + NODE_STRIDE > data.length) break;

            const row = readNode(data, cursor, CONTRACT_DIR_RECEIVE);
            cursor += NODE_STRIDE;
            applyPoster(row, posters, flatIndex++);
            getRule.push(row);
        }
    }

    if (!giveRules.length) giveRules.push([]);

    return { giveRules, getRule };
};

const parseLegacy = (data: number[], stringData: string): ContractRules => {
    const count = data.length > 0 ? Math.max(0, data[0]) : 0;
    const give: ContractTermRow[] = [];
    const getRule: ContractTermRow[] = [];
    const posters = parsePosters(stringData);

    for (let i = 0; i < count; i++) {
        const base = 1 + i * LEGACY_STRIDE;
        if (base + LEGACY_STRIDE - 1 >= data.length) break;

        const direction = data[base] === CONTRACT_DIR_RECEIVE ? CONTRACT_DIR_RECEIVE : CONTRACT_DIR_PAY;
        const row: ContractTermRow = {
            direction,
            kind: CONTRACT_KIND_CURRENCY,
            currencyType: data[base + 1],
            wallItem: false,
            baseItemId: 0,
            amount: Math.max(0, data[base + 2]),
        };

        applyPoster(row, posters, i);
        (direction === CONTRACT_DIR_RECEIVE ? getRule : give).push(row);
    }

    return { giveRules: [give], getRule };
};

const parsePosters = (stringData: string): Map<number, string> => {
    const posters = new Map<number, string>();

    if (!stringData) return posters;

    for (const part of stringData.split(',')) {
        const eq = part.indexOf('=');
        if (eq <= 0) continue;

        const index = parseInt(part.slice(0, eq), 10);
        if (!Number.isNaN(index)) posters.set(index, part.slice(eq + 1));
    }

    return posters;
};

const applyPoster = (row: ContractTermRow, posters: Map<number, string>, index: number) => {
    if (row.kind === CONTRACT_KIND_FURNI && row.wallItem && posters.has(index)) row.posterId = posters.get(index);
};

const writeNode = (out: number[], row: ContractTermRow) => {
    out.push(row.kind === CONTRACT_KIND_FURNI ? CONTRACT_KIND_FURNI : CONTRACT_KIND_CURRENCY);
    out.push(row.kind === CONTRACT_KIND_FURNI ? 0 : row.currencyType);
    out.push(row.wallItem ? 1 : 0);
    out.push(row.kind === CONTRACT_KIND_FURNI ? Math.max(0, row.baseItemId) : 0);
    out.push(Math.max(0, row.amount));
};

/**
 * Write the grammar for the server, in the shape it reads back.
 *
 * Rows with no amount are dropped rather than sent: a term asking for nothing is not a term, and
 * the server would drop it anyway — doing it here keeps what the dialog shows and what gets saved
 * the same thing.
 */
export const serializeContractRules = (rules: ContractRules): { intParams: number[]; stringParam: string } => {
    const intParams: number[] = [CONTRACT_RULES_FORMAT];
    const posterParts: string[] = [];
    let flatIndex = 0;

    const giveRules = rules.giveRules.slice(0, CONTRACT_MAX_RULES).map((rule) => rule.filter((row) => row.amount > 0).slice(0, CONTRACT_MAX_NODES));
    const getRule = rules.getRule.filter((row) => row.amount > 0).slice(0, CONTRACT_MAX_NODES);

    intParams.push(giveRules.length);

    for (const rule of giveRules) {
        intParams.push(rule.length);

        for (const row of rule) {
            writeNode(intParams, row);

            if (row.kind === CONTRACT_KIND_FURNI && row.wallItem) posterParts.push(`${ flatIndex }=${ row.posterId ?? '' }`);

            flatIndex++;
        }
    }

    intParams.push(getRule.length);

    for (const row of getRule) {
        writeNode(intParams, row);

        if (row.kind === CONTRACT_KIND_FURNI && row.wallItem) posterParts.push(`${ flatIndex }=${ row.posterId ?? '' }`);

        flatIndex++;
    }

    return { intParams, stringParam: posterParts.join(',') };
};

export const CURRENCY_OPTIONS = [
    { value: -1, label: 'Credits' },
    { value: 0, label: 'Duckets' },
    { value: 5, label: 'Diamonds' },
];
