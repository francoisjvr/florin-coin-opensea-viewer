#!/usr/bin/env python
"""Convert a MagicaVoxel .vox file into a compact vertex-colored GLB.

This keeps the voxel look, but greedily merges adjacent coplanar faces with the
same palette color so the exported mesh is much lighter than one cube per voxel.
MagicaVoxel's Z axis is mapped to glTF/Three.js Y-up, so flat coin files with a
64 x 8 x 64 size stand upright rather than lying down.
"""
from __future__ import annotations

import json
import math
import struct
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

Voxel = Tuple[int, int, int, int]
Vec3 = Tuple[float, float, float]

# Official MagicaVoxel default palette fallback. We rarely use it because Florin
# has an RGBA chunk, but keeping this makes the converter safe for minimal files.
DEFAULT_PALETTE = [(255, 255, 255, 255)] * 256


def read_dict(data: bytes, pos: int) -> tuple[dict[str, str], int]:
    n, = struct.unpack_from('<I', data, pos)
    pos += 4
    out = {}
    for _ in range(n):
        k_len, = struct.unpack_from('<I', data, pos)
        pos += 4
        key = data[pos:pos + k_len].decode('utf-8', 'replace')
        pos += k_len
        v_len, = struct.unpack_from('<I', data, pos)
        pos += 4
        val = data[pos:pos + v_len].decode('utf-8', 'replace')
        pos += v_len
        out[key] = val
    return out, pos


def iter_chunks(data: bytes, start: int, end: int):
    pos = start
    while pos + 12 <= end:
        cid = data[pos:pos + 4].decode('ascii', 'replace')
        content_size, child_size = struct.unpack_from('<II', data, pos + 4)
        content_start = pos + 12
        child_start = content_start + content_size
        chunk_end = child_start + child_size
        yield cid, content_start, content_size, child_start, child_size, chunk_end
        if child_size:
            yield from iter_chunks(data, child_start, chunk_end)
        pos = chunk_end


def parse_vox(path: Path) -> tuple[tuple[int, int, int], list[Voxel], list[tuple[int, int, int, int]]]:
    data = path.read_bytes()
    if data[:4] != b'VOX ':
        raise ValueError(f'{path} is not a VOX file')
    size = None
    voxels: list[Voxel] = []
    palette = DEFAULT_PALETTE[:]

    for cid, content_start, content_size, *_ in iter_chunks(data, 8, len(data)):
        if cid == 'SIZE':
            size = struct.unpack_from('<III', data, content_start)
        elif cid == 'XYZI':
            n, = struct.unpack_from('<I', data, content_start)
            pos = content_start + 4
            voxels = [struct.unpack_from('BBBB', data, pos + i * 4) for i in range(n)]
        elif cid == 'RGBA':
            palette = [struct.unpack_from('BBBB', data, content_start + i * 4) for i in range(256)]

    if size is None:
        raise ValueError('VOX file has no SIZE chunk')
    if not voxels:
        raise ValueError('VOX file has no XYZI voxels')
    return size, voxels, palette


def map_point(p: tuple[float, float, float]) -> Vec3:
    # VOX: X right, Y depth, Z up. glTF/Three.js: X right, Y up, Z depth.
    x, y, z = p
    return (float(x), float(z), float(-y))


def map_normal(n: tuple[int, int, int]) -> Vec3:
    x, y, z = n
    return (float(x), float(z), float(-y))


def cross(a: Vec3, b: Vec3) -> Vec3:
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def sub(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def dot(a: Vec3, b: Vec3) -> float:
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def greedy_rectangles(cells: dict[tuple[int, int], int]):
    """Yield (u, v, w, h, color_index) rectangles from sparse colored cells."""
    remaining = dict(cells)
    while remaining:
        (u0, v0), color = min(remaining.items(), key=lambda kv: (kv[0][1], kv[0][0]))
        w = 1
        while remaining.get((u0 + w, v0)) == color:
            w += 1
        h = 1
        while True:
            row_ok = all(remaining.get((u0 + du, v0 + h)) == color for du in range(w))
            if not row_ok:
                break
            h += 1
        for du in range(w):
            for dv in range(h):
                remaining.pop((u0 + du, v0 + dv), None)
        yield u0, v0, w, h, color


def build_mesh(size: tuple[int, int, int], voxels: list[Voxel], palette):
    occupied: Dict[tuple[int, int, int], int] = {(x, y, z): c for x, y, z, c in voxels}
    dirs = [
        ('px', (1, 0, 0), 'x'), ('nx', (-1, 0, 0), 'x'),
        ('py', (0, 1, 0), 'y'), ('ny', (0, -1, 0), 'y'),
        ('pz', (0, 0, 1), 'z'), ('nz', (0, 0, -1), 'z'),
    ]
    planes: dict[tuple[str, int], dict[tuple[int, int], int]] = defaultdict(dict)

    for x, y, z, c in voxels:
        for name, (dx, dy, dz), axis in dirs:
            if (x + dx, y + dy, z + dz) in occupied:
                continue
            if axis == 'x':
                plane = x + (1 if dx > 0 else 0)
                u, v = y, z
            elif axis == 'y':
                plane = y + (1 if dy > 0 else 0)
                u, v = x, z
            else:
                plane = z + (1 if dz > 0 else 0)
                u, v = x, y
            planes[(name, plane)][(u, v)] = c

    positions: list[Vec3] = []
    normals: list[Vec3] = []
    colors: list[tuple[float, float, float, float]] = []
    indices: list[int] = []

    def add_quad(vox_points: list[tuple[float, float, float]], vox_normal: tuple[int, int, int], color_index: int):
        pts = [map_point(p) for p in vox_points]
        n = map_normal(vox_normal)
        face_n = cross(sub(pts[1], pts[0]), sub(pts[2], pts[0]))
        order = [0, 1, 2, 3]
        if dot(face_n, n) < 0:
            order = [0, 3, 2, 1]
        base = len(positions)
        r, g, b, a = palette[color_index - 1 if color_index else 0]
        col = (r / 255.0, g / 255.0, b / 255.0, a / 255.0)
        for idx in order:
            positions.append(pts[idx])
            normals.append(n)
            colors.append(col)
        indices.extend([base, base + 1, base + 2, base, base + 2, base + 3])

    for (name, plane), cells in planes.items():
        for u, v, w, h, c in greedy_rectangles(cells):
            if name == 'px':
                pts = [(plane, u, v), (plane, u + w, v), (plane, u + w, v + h), (plane, u, v + h)]
                add_quad(pts, (1, 0, 0), c)
            elif name == 'nx':
                pts = [(plane, u, v), (plane, u + w, v), (plane, u + w, v + h), (plane, u, v + h)]
                add_quad(pts, (-1, 0, 0), c)
            elif name == 'py':
                pts = [(u, plane, v), (u + w, plane, v), (u + w, plane, v + h), (u, plane, v + h)]
                add_quad(pts, (0, 1, 0), c)
            elif name == 'ny':
                pts = [(u, plane, v), (u + w, plane, v), (u + w, plane, v + h), (u, plane, v + h)]
                add_quad(pts, (0, -1, 0), c)
            elif name == 'pz':
                pts = [(u, v, plane), (u + w, v, plane), (u + w, v + h, plane), (u, v + h, plane)]
                add_quad(pts, (0, 0, 1), c)
            elif name == 'nz':
                pts = [(u, v, plane), (u + w, v, plane), (u + w, v + h, plane), (u, v + h, plane)]
                add_quad(pts, (0, 0, -1), c)

    return positions, normals, colors, indices


def pack_accessor(values, fmt: str):
    flat = []
    for v in values:
        flat.extend(v if isinstance(v, tuple) else (v,))
    return struct.pack('<' + fmt * len(flat), *flat)


def pad4(b: bytes, pad: bytes = b'\x00') -> bytes:
    return b + pad * ((4 - len(b) % 4) % 4)


def minmax_vec(values: list[Vec3]):
    return [list(map(min, zip(*values))), list(map(max, zip(*values)))]


def write_glb(path: Path, positions, normals, colors, indices):
    blobs = []
    views = []
    offset = 0

    def add_blob(blob: bytes, target: int):
        nonlocal offset
        blob = pad4(blob)
        idx = len(views)
        views.append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(blob), 'target': target})
        blobs.append(blob)
        offset += len(blob)
        return idx

    pos_view = add_blob(pack_accessor(positions, 'f'), 34962)
    norm_view = add_blob(pack_accessor(normals, 'f'), 34962)
    color_view = add_blob(pack_accessor(colors, 'f'), 34962)
    index_component = 5125
    index_blob = struct.pack('<' + 'I' * len(indices), *indices)
    index_view = add_blob(index_blob, 34963)

    mn, mx = minmax_vec(positions)
    accessors = [
        {'bufferView': pos_view, 'componentType': 5126, 'count': len(positions), 'type': 'VEC3', 'min': mn, 'max': mx},
        {'bufferView': norm_view, 'componentType': 5126, 'count': len(normals), 'type': 'VEC3'},
        {'bufferView': color_view, 'componentType': 5126, 'count': len(colors), 'type': 'VEC4'},
        {'bufferView': index_view, 'componentType': index_component, 'count': len(indices), 'type': 'SCALAR'},
    ]
    gltf = {
        'asset': {'version': '2.0', 'generator': 'Hermes vox-to-greedy-glb'},
        'scene': 0,
        'scenes': [{'nodes': [0]}],
        'nodes': [{'mesh': 0, 'name': 'Florin Coin VOX upright'}],
        'meshes': [{
            'name': 'Florin Coin greedy voxel mesh',
            'primitives': [{
                'attributes': {'POSITION': 0, 'NORMAL': 1, 'COLOR_0': 2},
                'indices': 3,
                'material': 0,
                'mode': 4,
            }],
        }],
        'materials': [{
            'name': 'VOX palette vertex colors',
            'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0.12, 'roughnessFactor': 0.72},
            'doubleSided': False,
        }],
        'buffers': [{'byteLength': offset}],
        'bufferViews': views,
        'accessors': accessors,
    }
    json_chunk = pad4(json.dumps(gltf, separators=(',', ':')).encode('utf-8'), b' ')
    bin_chunk = b''.join(blobs)
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    glb = b'glTF' + struct.pack('<II', 2, total)
    glb += struct.pack('<I4s', len(json_chunk), b'JSON') + json_chunk
    glb += struct.pack('<I4s', len(bin_chunk), b'BIN\x00') + bin_chunk
    path.write_bytes(glb)


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print('usage: convert-vox-to-glb.py input.vox output.glb', file=sys.stderr)
        return 2
    src = Path(argv[1])
    dst = Path(argv[2])
    size, voxels, palette = parse_vox(src)
    positions, normals, colors, indices = build_mesh(size, voxels, palette)
    dst.parent.mkdir(parents=True, exist_ok=True)
    write_glb(dst, positions, normals, colors, indices)
    print(json.dumps({
        'source': str(src),
        'output': str(dst),
        'size': size,
        'voxels': len(voxels),
        'greedy_quads': len(indices) // 6,
        'vertices': len(positions),
        'triangles': len(indices) // 3,
        'bytes': dst.stat().st_size,
    }, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
