'use client';

import { useMemo } from 'react';
import { DoubleSide } from 'three';
import * as THREE from 'three';
import { ChassisMaterial } from '@/scene/materials/ChassisMaterial';
import { useCommandStore } from '@/store/useCommandStore';

export function WorldHorizon({ accent }: { accent: string }) {
  const quality = useCommandStore((s) => s.quality.level);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: { uAccent: { value: new THREE.Color(accent) } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uAccent;
          varying vec2 vUv;
          void main() {
            vec2 p = vUv - 0.5;
            float r = length(p) * 2.0;
            float fade = smoothstep(1.0, 0.18, r);
            float rings = smoothstep(0.05, 0.0, abs(sin(r * 22.0)));
            vec3 graphite = vec3(0.14, 0.16, 0.185);
            vec3 col = graphite + vec3(0.82, 0.85, 0.9) * rings * 0.16 + uAccent * rings * 0.06;
            gl_FragColor = vec4(col, fade * 0.96);
          }
        `,
      }),
    [accent],
  );

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.25, 0]}>
        <circleGeometry args={[13.85, quality === 'low' ? 32 : 72]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.22, 0]}>
        <circleGeometry args={[2.1, 32]} />
        <ChassisMaterial roughness={0.38} />
      </mesh>
      {[4.2, 7.1, 10.4].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.18, 0]}>
          <torusGeometry args={[r, 0.02, 8, 64]} />
          <meshBasicMaterial color="#E6E8EC" transparent opacity={0.22} />
        </mesh>
      ))}
      <mesh rotation={[1.15, 0.12, 0.08]}>
        <torusGeometry args={[11.6, 0.01, 8, 80]} />
        <meshBasicMaterial color={accent} transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
