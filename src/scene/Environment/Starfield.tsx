'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '@/store/useCommandStore';
import { particleCount } from '@/lib/quality';

export function Starfield() {
  const level = useCommandStore((s) => s.quality.level);
  const count = particleCount(level, 2800, 1600, 700);

  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const r = 70 + Math.random() * 90;
      const t = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(ph) * Math.cos(t);
      positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(t) * 0.7;
      positions[i * 3 + 2] = r * Math.cos(ph);
      sizes[i] = 0.6 + Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geometry;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uOp: { value: 1 } },
        vertexShader: `
          attribute float aSize;
          varying float vS;
          void main() {
            vS = aSize;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * 2.2 * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying float vS;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, d) * 0.35;
            gl_FragColor = vec4(0.85, 0.88, 0.95, a);
          }
        `,
      }),
    [],
  );

  useFrame((_, dt) => {
    material.uniforms.uOp.value = Math.min(1, (material.uniforms.uOp.value as number) + dt * 0.4);
  });

  return <points geometry={geo} material={material} />;
}
