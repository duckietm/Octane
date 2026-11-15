import type { Buffer, Container, Geometry, Mesh, Renderer, Shader, Texture, UniformGroup } from 'pixi.js';
import { HeightmapInstances } from './heightmap';
import { makeFloorTexture, makeWallTexture, TextureImage } from './textures';
import { Mat4 } from './mat4';

type Pixi = typeof import('pixi.js');

const VERTEX = /* glsl */ `
    in vec3 aPosition;
    in vec3 aNormal;
    in vec3 aInstanceOffset;
    in vec3 aInstanceSize;
    in vec3 aInstanceColor;
    in float aInstanceFlags;

    uniform mat4 uViewProj;
    uniform vec3 uLightDirection;
    uniform vec2 uHoverTile;

    out vec3 vColor;
    out vec4 vTint;
    out float vLight;
    out vec2 vFace;
    out vec2 vExtent;
    out float vKind;

    void main() {
        vec3 world = aInstanceOffset + aPosition * aInstanceSize;
        float diffuse = max(0.0, dot(aNormal, normalize(uLightDirection)));
        vLight = 0.62 + 0.38 * diffuse;
        vColor = aInstanceColor;

        // Flags: 1 selected, 2 occupied, 4 ghost, 8 wall, 16 marker.
        float flags = aInstanceFlags;
        bool selected = mod(flags, 2.0) >= 1.0;
        bool occupied = mod(floor(flags / 2.0), 2.0) >= 1.0;
        bool wall = mod(floor(flags / 8.0), 2.0) >= 1.0;
        bool marker = mod(floor(flags / 16.0), 2.0) >= 1.0;
        bool hovered = !wall && !marker && abs(aInstanceOffset.x - uHoverTile.x) < 0.5 && abs(aInstanceOffset.z - uHoverTile.y) < 0.5;

        // Highlight tint, applied after texturing so it reads in both modes.
        vTint = vec4(0.0);
        if (occupied) vTint = vec4(0.98, 0.45, 0.09, 0.45);
        if (selected) vTint = vec4(0.98, 0.80, 0.08, 0.55);
        if (hovered) vTint = vec4(mix(vTint.rgb, vec3(1.0), 0.5), max(vTint.a, 0.35));

        // Face kind: -1 marker (flat, no edge lines), 1 floor top, 2 column side, 3 wall.
        if (marker) vKind = -1.0;
        else if (wall) vKind = 3.0;
        else vKind = (aNormal.y > 0.5) ? 1.0 : 2.0;

        // In-plane coordinates of this face in world units, for edge lines and texture tiling.
        vec3 sized = aPosition * aInstanceSize;
        if (abs(aNormal.y) > 0.5) {
            vFace = vec2(sized.x, sized.z);
            vExtent = vec2(aInstanceSize.x, aInstanceSize.z);
        } else if (abs(aNormal.x) > 0.5) {
            vFace = vec2(sized.z, sized.y);
            vExtent = vec2(aInstanceSize.z, aInstanceSize.y);
        } else {
            vFace = vec2(sized.x, sized.y);
            vExtent = vec2(aInstanceSize.x, aInstanceSize.y);
        }

        gl_Position = uViewProj * vec4(world, 1.0);
    }
`;

const FRAGMENT = /* glsl */ `
    in vec3 vColor;
    in vec4 vTint;
    in float vLight;
    in vec2 vFace;
    in vec2 vExtent;
    in float vKind;

    uniform sampler2D uFloorTexture;
    uniform sampler2D uWallTexture;
    uniform float uTextured;

    out vec4 finalColor;

    void main() {
        if (vKind < 0.0) {
            finalColor = vec4(vColor * vLight, 1.0);
            return;
        }

        vec3 base = vColor;

        if (uTextured > 0.5) {
            if (vKind > 2.5) {
                // wall: one panel per tile along; the skirting starts at floor level (above the slab)
                base = texture(uWallTexture, vec2(fract(vFace.x), 1.0 - clamp((vFace.y - 0.25) / 2.0, 0.0, 1.0))).rgb;
            } else if (vKind > 1.5) {
                // column side: the floor's darker edge
                base = vec3(0.66, 0.64, 0.58);
            } else {
                // floor top: one floor tile per world unit
                base = texture(uFloorTexture, fract(vFace)).rgb;
            }
        }

        base = mix(base, vTint.rgb, vTint.a);

        float toEdge = min(min(vFace.x, vExtent.x - vFace.x), min(vFace.y, vExtent.y - vFace.y));
        float edge = (vKind > 2.5) ? 1.0 : smoothstep(0.0, 0.04, toEdge);
        finalColor = vec4(base * vLight * mix(0.6, 1.0, edge), 1.0);
    }
`;

const buildBox = (): { positions: Float32Array; normals: Float32Array; indices: Uint16Array } => {
    const faces: Array<{ n: [number, number, number]; v: Array<[number, number, number]> }> = [
        { n: [0, 1, 0], v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] }, // top
        { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] }, // bottom
        { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] }, // south (+z)
        { n: [0, 0, -1], v: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] }, // north (-z)
        { n: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] }, // east (+x)
        { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] } // west (-x)
    ];
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    faces.forEach((face, faceIndex) => {
        const base = faceIndex * 4;
        face.v.forEach((vertex) => {
            positions.push(...vertex);
            normals.push(...face.n);
        });
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });

    return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) };
};

export class FloorplanScene {
    private readonly viewProj = new Float32Array(16);
    private broken = false;

    private constructor(
        private readonly pixi: Pixi,
        readonly canvas: HTMLCanvasElement,
        private readonly renderer: Renderer,
        private readonly stage: Container,
        private readonly mesh: Mesh<Geometry, Shader>,
        private readonly uniforms: UniformGroup,
        private readonly offsetBuffer: Buffer,
        private readonly sizeBuffer: Buffer,
        private readonly colorBuffer: Buffer,
        private readonly flagBuffer: Buffer,
        private floorTexture: Texture,
        private wallTexture: Texture
    ) {}

    static async create(host: HTMLElement, width: number, height: number): Promise<FloorplanScene> {
        const pixi: Pixi = await import('pixi.js');
        const canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.display = 'block';
        canvas.setAttribute('aria-hidden', 'true');
        host.prepend(canvas);

        const renderer = await pixi.autoDetectRenderer({
            preference: 'webgl',
            canvas,
            width: Math.max(1, Math.floor(width)),
            height: Math.max(1, Math.floor(height)),
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true,
            backgroundAlpha: 1,
            background: 0x000000,
            useBackBuffer: false,
            eventMode: 'none'
        });

        const box = buildBox();
        const vertexUsage = pixi.BufferUsage.VERTEX | pixi.BufferUsage.COPY_DST;
        const offsetBuffer = new pixi.Buffer({ data: new Float32Array(3), usage: vertexUsage, label: 'floorplan-offsets' });
        const sizeBuffer = new pixi.Buffer({ data: new Float32Array(3), usage: vertexUsage, label: 'floorplan-sizes' });
        const colorBuffer = new pixi.Buffer({ data: new Float32Array(3), usage: vertexUsage, label: 'floorplan-colors' });
        const flagBuffer = new pixi.Buffer({ data: new Float32Array(1), usage: vertexUsage, label: 'floorplan-flags' });

        const geometry = new pixi.Geometry({
            attributes: {
                aPosition: { buffer: box.positions, format: 'float32x3' },
                aNormal: { buffer: box.normals, format: 'float32x3' },
                aInstanceOffset: { buffer: offsetBuffer, format: 'float32x3', instance: true },
                aInstanceSize: { buffer: sizeBuffer, format: 'float32x3', instance: true },
                aInstanceColor: { buffer: colorBuffer, format: 'float32x3', instance: true },
                aInstanceFlags: { buffer: flagBuffer, format: 'float32', instance: true }
            },
            indexBuffer: box.indices,
            instanceCount: 0
        });

        const uniforms = new pixi.UniformGroup({
            uViewProj: { value: new Float32Array(16), type: 'mat4x4<f32>' },
            uLightDirection: { value: new Float32Array([0.35, 1, 0.55]), type: 'vec3<f32>' },
            uHoverTile: { value: new Float32Array([-1000, -1000]), type: 'vec2<f32>' },
            uTextured: { value: 0, type: 'f32' }
        });

        const floorTexture = pixi.Texture.from(makeFloorTexture());
        const wallTexture = pixi.Texture.from(makeWallTexture());
        floorTexture.source.scaleMode = 'nearest';
        wallTexture.source.scaleMode = 'nearest';

        const shader = pixi.Shader.from({
            gl: { vertex: VERTEX, fragment: FRAGMENT, name: 'floorplan-heightmap' },
            resources: { uniforms, uFloorTexture: floorTexture.source, uWallTexture: wallTexture.source }
        });

        const state = pixi.State.for2d();
        state.depthTest = true;
        state.depthMask = true;
        state.cullMode = 'none';
        state.blend = false;

        const mesh = new pixi.Mesh({ geometry, shader, state });
        mesh.visible = false;

        const stage = new pixi.Container();
        stage.addChild(mesh);

        return new FloorplanScene(pixi, canvas, renderer, stage, mesh, uniforms, offsetBuffer, sizeBuffer, colorBuffer, flagBuffer, floorTexture, wallTexture);
    }

    /** Upload a new set of tile columns. */
    update(instances: HeightmapInstances): void {
        this.mesh.geometry.instanceCount = instances.count;
        this.mesh.visible = instances.count > 0;

        if (instances.count === 0) return;

        this.offsetBuffer.data = instances.offsets;
        this.sizeBuffer.data = instances.sizes;
        this.colorBuffer.data = instances.colors;
        this.flagBuffer.data = instances.flags;
    }

    setTextured(textured: boolean): void {
        (this.uniforms.uniforms as { uTextured: number }).uTextured = textured ? 1 : 0;
        this.uniforms.update();
    }

    async setTextures(floor?: TextureImage, wall?: TextureImage): Promise<void> {
        const pixi: Pixi = await import('pixi.js');

        if (floor) {
            const next = pixi.Texture.from(floor);
            next.source.scaleMode = 'nearest';
            this.mesh.shader.resources.uFloorTexture = next.source;
            this.floorTexture.destroy(true);
            this.floorTexture = next;
        }

        if (wall) {
            const next = pixi.Texture.from(wall);
            next.source.scaleMode = 'nearest';
            this.mesh.shader.resources.uWallTexture = next.source;
            this.wallTexture.destroy(true);
            this.wallTexture = next;
        }
    }

    setHover(tile: { row: number; col: number } | null): void {
        const value = (this.uniforms.uniforms as { uHoverTile: Float32Array }).uHoverTile;
        value[0] = tile ? tile.col : -1000;
        value[1] = tile ? tile.row : -1000;
        this.uniforms.update();
    }

    setCamera(viewProj: Mat4): void {
        this.viewProj.set(viewProj);
        (this.uniforms.uniforms as { uViewProj: Float32Array }).uViewProj.set(viewProj);
        this.uniforms.update();
    }

    resize(width: number, height: number): void {
        const nextWidth = Math.max(1, Math.floor(width));
        const nextHeight = Math.max(1, Math.floor(height));
        const resolution = window.devicePixelRatio || 1;

        if (this.renderer.width === nextWidth * resolution && this.renderer.height === nextHeight * resolution && this.renderer.resolution === resolution) return;

        this.renderer.resize(nextWidth, nextHeight, resolution);
    }

    render(): void {
        if (this.broken) return;

        try {
            this.renderer.render({ container: this.stage, clear: true });
        } catch (error) {
            this.broken = true;
            console.error('[Floorplan3D] render failed', error);
        }
    }

    destroy(): void {
        const empty = this.pixi.Texture.EMPTY.source;
        this.mesh.shader.resources.uFloorTexture = empty;
        this.mesh.shader.resources.uWallTexture = empty;
        this.stage.destroy({ children: true });
        this.floorTexture.destroy(true);
        this.wallTexture.destroy(true);
        this.renderer.destroy();
        this.canvas.remove();
    }
}
