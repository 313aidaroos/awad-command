'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '@/store/useCommandStore';
import { particleCount } from '@/lib/quality';

export function Starfield() {
  const level = useCommandStore((s) => s.quality.level);
  const group = useRef<THREE.Points>(null);
  const count = particleCount(level, 320, 200, 110);

  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const t = Math.random() * Math.PI * 2;
      const r = 52 + Math.random() * 90;
      const ph = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(ph) * Math.cos(t);
      positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(t) * 0.55;
      positions[i * 3 + 2] = r * Math.cos(ph);
      const cool = Math.random();
      colors[i * 3] = 0.62 + cool * 0.18;
      colors[i * 3 + 1] = 0.66 + cool * 0.14;
      colors[i * 3 + 2] = 0.74 + cool * 0.12;
      sizes[i] = 0.35 + Math.random() * 0.55;
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
            gl_PointSize = aSize * 1.6 * (240.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vC;
          varying float vS;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float core = smoothstep(0.42, 0.12, d);
            float a = core * mix(0.12, 0.38, clamp(vS / 1.1, 0.0, 1.0));
            gl_FragColor = vec4(vC, a);
          }
        `,
      }),
    [],
  );

  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.0004;
  });

  return <points ref={group} geometry={geo} material={material} />;
}
