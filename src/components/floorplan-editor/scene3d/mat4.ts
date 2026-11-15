/**
 * Minimal column-major 4x4 matrix helpers for the floorplan 3D preview.
 * Layout matches WebGL: element (row r, column c) lives at index c * 4 + r.
 */
export type Mat4 = Float32Array;
export type Vec3 = readonly [number, number, number];

export const mat4Identity = (): Mat4 => {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
};

/** out = a * b (apply b first, then a). */
export const mat4Multiply = (a: Mat4, b: Mat4, out: Mat4 = new Float32Array(16)): Mat4 => {
    for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) {
            out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
        }
    }
    return out;
};

/** OpenGL-style perspective projection (clip z in [-1, 1]). */
export const mat4Perspective = (fovYRadians: number, aspect: number, near: number, far: number): Mat4 => {
    const f = 1 / Math.tan(fovYRadians / 2);
    const m = new Float32Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) / (near - far);
    m[11] = -1;
    m[14] = (2 * far * near) / (near - far);
    return m;
};

const normalize = (v: Vec3): Vec3 => {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
};

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Right-handed view matrix looking from `eye` at `target`. */
export const mat4LookAt = (eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Mat4 => {
    const z = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    const x = normalize(cross(up, z));
    const y = cross(z, x);
    const m = new Float32Array(16);
    m[0] = x[0]; m[4] = x[1]; m[8] = x[2]; m[12] = -dot(x, eye);
    m[1] = y[0]; m[5] = y[1]; m[9] = y[2]; m[13] = -dot(y, eye);
    m[2] = z[0]; m[6] = z[1]; m[10] = z[2]; m[14] = -dot(z, eye);
    m[15] = 1;
    return m;
};

/** Transform a point by a matrix and return normalised device coordinates (x, y, depth). */
export const mat4Project = (m: Mat4, p: Vec3): Vec3 => {
    const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
    const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
    const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
    const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15] || 1;
    return [x / w, y / w, z / w];
};
