'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';

export interface PbrSuite {
  graphiteAlbedo: THREE.DataTexture;
  graphiteRough: THREE.DataTexture;
  graphiteMetal: THREE.DataTexture;
  graphiteNormal: THREE.DataTexture;
  brushRough: THREE.DataTexture;
  brushNormal: THREE.DataTexture;
  floorRough: THREE.DataTexture;
}

export function hash21(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

/** Horizontal brush + grain. Writes RGBA; RGB is greyscale roughness. */
export function fillBrushRoughness(out: Uint8Array, size: number, seed = 1.7): void {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let streak = 0;
      for (let o = 0; o < 4; o += 1) {
        const band = hash21(Math.floor(x / (2 + o)), Math.floor((y / size) * (14 + o * 10)), seed + o);
        streak += band * (0.5 / (o + 1));
      }
      const grain = hash21(x * 0.37, y * 1.9, seed) * 0.16;
      const v = Math.min(255, Math.max(0, (0.22 + streak * 0.62 + grain) * 255));
      const i = (y * size + x) * 4;
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = 255;
    }
  }
}

export function fillGraphiteAlbedo(out: Uint8Array, size: number, seed = 3.1): void {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = hash21(x * 0.21, y * 0.19, seed);
      const streak = hash21(Math.floor(x / 3), y * 0.08, seed + 1);
      const tone = 0.14 + n * 0.07 + streak * 0.05;
      const i = (y * size + x) * 4;
      out[i] = Math.round(tone * 255);
      out[i + 1] = Math.round((tone + 0.012) * 255);
      out[i + 2] = Math.round((tone + 0.028) * 255);
      out[i + 3] = 255;
    }
  }
}

export function fillMetalness(out: Uint8Array, size: number, seed = 5.4): void {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const streak = hash21(Math.floor(x / 2), y * 0.11, seed);
      const v = Math.min(255, Math.max(0, (0.62 + streak * 0.32) * 255));
      const i = (y * size + x) * 4;
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = 255;
    }
  }
}

export function fillNormalFromHeight(out: Uint8Array, height: Uint8Array, size: number, strength = 1.6): void {
  const at = (x: number, y: number) => height[(((y + size) % size) * size + ((x + size) % size)) * 4]! / 255;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      out[i] = Math.round((-dx * inv * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((-dy * inv * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((inv * 0.5 + 0.5) * 255);
      out[i + 3] = 255;
    }
  }
}

export function fillFloorRoughness(out: Uint8Array, size: number): void {
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const n = hash21(x * 0.17, y * 0.15, 9.2);
      const streak = hash21(Math.floor(x / 4), y * 0.09, 11.4);
      const v = Math.min(255, Math.max(0, (0.3 + n * 0.22 + streak * 0.2) * 255));
      const i = (y * size + x) * 4;
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = 255;
    }
  }
}

function dataTex(data: Uint8Array<ArrayBuffer>, size: number, srgb: boolean, rx = 2, ry = 2): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

let cache: PbrSuite | null = null;

function pixels(size: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(size * size * 4));
}

export function buildPbrSuite(size = 256): PbrSuite {
  const brush = pixels(size);
  const albedo = pixels(size);
  const metal = pixels(size);
  const floor = pixels(size);
  const brushN = pixels(size);
  const graphN = pixels(size);
  fillBrushRoughness(brush, size, 1.7);
  fillGraphiteAlbedo(albedo, size, 3.1);
  fillMetalness(metal, size, 5.4);
  fillFloorRoughness(floor, size);
  fillNormalFromHeight(brushN, brush, size, 1.8);
  fillNormalFromHeight(graphN, albedo, size, 2.1);
  return {
    graphiteAlbedo: dataTex(albedo, size, true, 2.2, 2.2),
    graphiteRough: dataTex(brush, size, false, 2.4, 5.5),
    graphiteMetal: dataTex(metal, size, false, 2.4, 5.5),
    graphiteNormal: dataTex(graphN, size, false, 2.4, 5.5),
    brushRough: dataTex(brush, size, false, 0.8, 4.2),
    brushNormal: dataTex(brushN, size, false, 0.8, 4.2),
    floorRough: dataTex(floor, size, false, 7, 7),
  };
}

export function getPbrSuite(): PbrSuite {
  if (!cache) cache = buildPbrSuite(256);
  return cache;
}

export function usePbrSuite(): PbrSuite | null {
  const [suite, setSuite] = useState<PbrSuite | null>(cache);
  useEffect(() => {
    setSuite(getPbrSuite());
  }, []);
  return suite;
}
