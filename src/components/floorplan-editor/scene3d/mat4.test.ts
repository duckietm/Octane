import { describe, expect, it } from 'vitest';
import { mat4Identity, mat4LookAt, mat4Multiply, mat4Perspective, mat4Project } from './mat4';

const near = (a: number, b: number, eps = 1e-5) => Math.abs(a - b) < eps;

describe('mat4', () => {
    it('multiplies with the identity as a no-op', () => {
        const p = mat4Perspective(Math.PI / 3, 1.5, 0.1, 100);
        const out = mat4Multiply(mat4Identity(), p);
        expect(Array.from(out)).toEqual(Array.from(p));
    });

    it('applies the right-hand operand first', () => {
        const a = mat4Identity();
        a[12] = 5; // translate x by 5
        const b = mat4Identity();
        b[0] = 2; // scale x by 2
        const ab = mat4Multiply(a, b); // scale, then translate
        const [x] = mat4Project(ab, [1, 0, 0]);
        expect(near(x, 7)).toBe(true);
        const ba = mat4Multiply(b, a); // translate, then scale
        const [x2] = mat4Project(ba, [1, 0, 0]);
        expect(near(x2, 12)).toBe(true);
    });

    it('looks from the eye at the target down -z in view space', () => {
        const view = mat4LookAt([0, 0, 10], [0, 0, 0]);
        const [x, y, z] = mat4Project(view, [0, 0, 0]);
        expect(near(x, 0) && near(y, 0) && near(z, -10)).toBe(true);
        const [rx] = mat4Project(view, [1, 0, 0]);
        expect(near(rx, 1)).toBe(true);
    });

    it('maps the near and far planes to -1 and 1 in clip space', () => {
        const proj = mat4Perspective(Math.PI / 4, 1, 1, 50);
        const view = mat4LookAt([0, 0, 0], [0, 0, -1]);
        const vp = mat4Multiply(proj, view);
        expect(near(mat4Project(vp, [0, 0, -1])[2], -1)).toBe(true);
        expect(near(mat4Project(vp, [0, 0, -50])[2], 1, 1e-4)).toBe(true);
    });

    it('keeps a point above the target above the centre of the screen', () => {
        const proj = mat4Perspective(Math.PI / 4, 1, 0.1, 100);
        const view = mat4LookAt([10, 10, 10], [0, 0, 0]);
        const vp = mat4Multiply(proj, view);
        expect(mat4Project(vp, [0, 3, 0])[1]).toBeGreaterThan(0);
        expect(mat4Project(vp, [0, -3, 0])[1]).toBeLessThan(0);
    });
});
