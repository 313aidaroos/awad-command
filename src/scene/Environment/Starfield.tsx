'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '@/store/useCommandStore';
import { particleCount } from '@/lib/quality';

export function Starfield() {
  const level = useCommandStore((s) => s.quality.level);
  const group = useRef<THREE.Points>(null);
  const count = particleCount(level, 4200, 2400, 900);

  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const band = Math.random() < 0.38;
      const t = Math.random() * Math.PI * 2;
      if (band) {
        const r = 55 + Math.random() * 95;
        positions[i * 3] = Math.cos(t) * r;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
        positions[i * 3 + 2] = Math.sin(t) * r;
      } else {
        const r = 48 + Math.random() * 110;
        const ph = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(ph) * Math.cos(t);
        positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(t) * 0.62;
        positions[i * 3 + 2] = r * Math.cos(ph);
      }
      const cool = Math.random();
      colors[i * 3] = 0.72 + cool * 0.22;
      colors[i * 3 + 1] = 0.78 + cool * 0.16;
      colors[i * 3 + 2] = 0.88 + cool * 0.12;
      sizes[i] = Math.random() < 0.08 ? 1.8 + Math.random() * 1.4 : 0.45 + Math.random() * 0.9;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geometry;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        uniforms: { uOp: { value: 1 } },
        vertexShader: `
          attribute float aSize;
          varying vec3 vC;
          varying float vS;
          void main() {
            vC = color;
            vS = aSize;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * 2.6 * (280.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vC;
          varying float vS;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float core = smoothstep(0.45, 0.08, d);
            float halo = smoothstep(0.5, 0.18, d) * 0.35;
            float a = (core + halo) * mix(0.28, 0.72, clamp(vS / 2.4, 0.0, 1.0));
            gl_FragColor = vec4(vC, a);
          }
        `,
      }),
    [],
  );

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.0012;
  });

  return <points ref={group} geometry={geo} material={material} />;
}
