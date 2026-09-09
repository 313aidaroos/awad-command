'use client';

import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCommandStore } from '@/store/useCommandStore';

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vDir = normalize(w.xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 zenith = vec3(0.22, 0.38, 0.64);
    vec3 horizon = vec3(0.96, 0.58, 0.28);
    vec3 ground = vec3(0.16, 0.12, 0.14);
    vec3 col = mix(horizon, zenith, smoothstep(-0.02, 0.62, h));
    col = mix(ground, col, smoothstep(-0.22, 0.04, h));
    float sun = pow(max(0.0, dot(normalize(vDir), normalize(vec3(0.42, 0.28, 0.22)))), 48.0);
    col += vec3(1.0, 0.78, 0.4) * sun * 0.85;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function Mountains({ count }: { count: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + 0.2;
        const r = 78 + (i % 5) * 8;
        return {
          p: [Math.sin(a) * r, -6, Math.cos(a) * r] as [number, number, number],
          s: 10 + (i % 4) * 4,
          snow: i % 3 !== 0,
        };
      }),
    [count],
  );
  return (
    <group>
      {items.map((m, i) => (
        <group key={i} position={m.p}>
          <mesh>
            <coneGeometry args={[m.s * 0.85, m.s * 2.1, 6]} />
            <meshStandardMaterial color="#4A4E58" roughness={0.92} />
          </mesh>
          {m.snow ? (
            <mesh position={[0, m.s * 0.72, 0]}>
              <coneGeometry args={[m.s * 0.34, m.s * 0.7, 6]} />
              <meshStandardMaterial color="#E8EEF4" roughness={0.7} />
            </mesh>
          ) : null}
        </group>
      ))}
    </group>
  );
}

function Clouds({ count }: { count: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: ((i * 17) % 90) - 45,
        y: 10 + (i % 5) * 2.2,
        z: ((i * 13) % 80) - 40,
        s: 3.2 + (i % 4) * 1.1,
        phase: i * 0.7,
      })),
    [count],
  );
  const group = useMemo(() => ({ g: null as THREE.Group | null }), []);
  useFrame(({ clock }) => {
    if (!group.g) return;
    group.g.rotation.y = clock.elapsedTime * 0.004;
  });
  return (
    <group
      ref={(n) => {
        group.g = n;
      }}
    >
      {items.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[c.s * 0.7, 10, 8]} />
            <meshStandardMaterial color="#F7EDE0" transparent opacity={0.42} roughness={1} depthWrite={false} />
          </mesh>
          <mesh position={[c.s * 0.45, -0.1, 0.1]}>
            <sphereGeometry args={[c.s * 0.5, 10, 8]} />
            <meshStandardMaterial color="#F7EDE0" transparent opacity={0.36} roughness={1} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function DragonSky() {
  const level = useCommandStore((s) => s.quality.level);
  const sky = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  return (
    <group>
      <mesh>
        <sphereGeometry args={[160, 24, 16]} />
        <primitive object={sky} attach="material" />
      </mesh>
      <Mountains count={level === 'low' ? 7 : 12} />
      {level === 'low' ? null : <Clouds count={level === 'high' ? 16 : 10} />}
    </group>
  );
}
