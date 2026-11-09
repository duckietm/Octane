/** The CSM table of a text field and the cutoffs it gives a glyph. */
import type {
    CsmCutoffs,
    CsmRecord
} from './NativeTextTypes';
import { assertFinite, isArray } from './NativeTextMath';

var defaultCsmTable = Object.freeze({
        dark: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.5299999713897705, inside: 0.25, gamma: 1 }),
            Object.freeze({ pixelSize: 12, outside: -0.4399999976158142, inside: 0.20000000298023224, gamma: 1 }),
            Object.freeze({
                pixelSize: 13.333333969116211,
                outside: -0.43799999356269836,
                inside: 0.23800000548362732,
                gamma: 1
            }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.6000000238418579,
                inside: 0.4000000059604645,
                gamma: 1
            })
        ]),
        light: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.824999988079071, inside: 0.07500000298023224, gamma: 1 }),
            Object.freeze({ pixelSize: 12, outside: -0.824999988079071, inside: 0.02500000037252903, gamma: 1 }),
            Object.freeze({ pixelSize: 16, outside: -0.8199999928474426, inside: 0.11999999731779099, gamma: 1 }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.8600000143051147,
                inside: 0.3400000035762787,
                gamma: 1
            })
        ])
    }),
    defaultDarkCsmTable = defaultCsmTable.dark,
    mediumCsmTable = Object.freeze({
        dark: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.4399999976158142, inside: 0.4359999895095825, gamma: 1 }),
            Object.freeze({
                pixelSize: 10.666666984558105,
                outside: -0.4300000071525574,
                inside: 0.49399998784065247,
                gamma: 1
            }),
            Object.freeze({ pixelSize: 12, outside: -0.41999998688697815, inside: 0.5600000023841858, gamma: 1 }),
            Object.freeze({
                pixelSize: 17.33333396911621,
                outside: -0.41999998688697815,
                inside: 0.5600000023841858,
                gamma: 1
            }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.4699999988079071,
                inside: 0.6100000143051147,
                gamma: 1
            })
        ]),
        light: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.675000011920929, inside: 0.07500000298023224, gamma: 1 }),
            Object.freeze({ pixelSize: 12, outside: -0.5450000166893005, inside: 0.3050000071525574, gamma: 1 }),
            Object.freeze({ pixelSize: 16, outside: -0.5, inside: 0.4399999976158142, gamma: 1 }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.550000011920929,
                inside: 0.6499999761581421,
                gamma: 1
            })
        ])
    }),
    strongCsmTable = Object.freeze({
        dark: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.41999998688697815, inside: 0.5600000023841858, gamma: 1 }),
            Object.freeze({ pixelSize: 16, outside: -0.41999998688697815, inside: 0.5600000023841858, gamma: 1 }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.4699999988079071,
                inside: 0.6100000143051147,
                gamma: 1
            })
        ]),
        light: Object.freeze([
            Object.freeze({ pixelSize: 8, outside: -0.574999988079071, inside: 0.17499999701976776, gamma: 1 }),
            Object.freeze({ pixelSize: 12, outside: -0.39500001072883606, inside: 0.45500001311302185, gamma: 1 }),
            Object.freeze({ pixelSize: 16, outside: -0.41999998688697815, inside: 0.5199999809265137, gamma: 1 }),
            Object.freeze({
                pixelSize: 26.666667938232422,
                outside: -0.550000011920929,
                inside: 0.6499999761581421,
                gamma: 1
            })
        ])
    }),
    csmTables: readonly Readonly<Record<string, readonly CsmRecord[]>>[] = Object.freeze([defaultCsmTable, mediumCsmTable, strongCsmTable]);
export function interpolateCsmTable(pixelSize: number, table: readonly CsmRecord[] = defaultDarkCsmTable) {
    if ((assertFinite('pixelSize', pixelSize), pixelSize < 0)) throw new RangeError('pixelSize must be non-negative');
    if (!isArray(table) || table.length === 0) throw new TypeError('CSM table must contain at least one record');
    let fround = Math.fround,
        roundedSize = fround(pixelSize);
    if (roundedSize <= table[0]!.pixelSize) return { ...table[0]! };
    let last = table.at(-1)!;
    if (roundedSize >= last.pixelSize) return { ...last };
    for (let index = 1; index < table.length; index++) {
        let upper = table[index]!;
        if (roundedSize <= upper.pixelSize) {
            let lower = table[index - 1]!,
                fraction = fround((roundedSize - lower.pixelSize) / (upper.pixelSize - lower.pixelSize));
            return {
                pixelSize: roundedSize,
                outside: fround(lower.outside + (upper.outside - lower.outside) * fraction),
                inside: fround(lower.inside + (upper.inside - lower.inside) * fraction),
                gamma: lower.gamma
            };
        }
    }
    return { ...last };
}
export function applyTextFieldControlsToCutoffs(base: CsmCutoffs, pixelSize: number, thickness: number, sharpness: number) {
    assertFinite('base.outside', base.outside),
        assertFinite('base.inside', base.inside),
        assertFinite('pixelSize', pixelSize),
        assertFinite('thickness', thickness),
        assertFinite('sharpness', sharpness);
    let sharpnessScale = Math.max(-400, Math.min(400, sharpness)) / 1e4,
        thicknessScale = Math.max(-200, Math.min(200, thickness)) / 1e4;
    return {
        outside: base.outside + pixelSize * (sharpnessScale / 2 - thicknessScale),
        inside: base.inside - pixelSize * (sharpnessScale / 2 + thicknessScale),
        gamma: base.gamma ?? 1
    };
}
export function resolveTextFieldCsm(pixelSize: number, thickness = 0, sharpness = 0, colorType = 'dark', csmTableHint = 0) {
    if (!Number.isInteger(csmTableHint) || csmTableHint < 0 || csmTableHint >= csmTables.length) throw new RangeError('csmTableHint must be 0, 1, or 2');
    let table = csmTables[csmTableHint]![colorType]!;
    if (!table) throw new RangeError('colorType must be dark or light');
    return applyTextFieldControlsToCutoffs(interpolateCsmTable(pixelSize, table), pixelSize, thickness, sharpness);
}
