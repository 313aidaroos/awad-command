export const orbVert = `
varying vec3 vN;
varying vec3 vP;
varying vec3 vW;
void main() {
  vN = normalize(normalMatrix * normal);
  vP = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

/** Dark graphite pearl with a silver rim — not a candy glass ball. */
export const orbFrag = `
uniform vec3 uA;
uniform vec3 uS;
uniform float uT;
uniform float uAct;
uniform float uH;
uniform float uAlpha;
varying vec3 vN;
varying vec3 vP;
varying vec3 vW;
float n3(vec3 p) {
  return sin(p.x * 2.4 + uT * 0.35) * sin(p.y * 2.1 - uT * 0.22) * sin(p.z * 2.6 + uT * 0.18) * 0.5 + 0.5;
}
void main() {
  vec3 v = normalize(cameraPosition - vW);
  float ndv = max(dot(normalize(vN), v), 0.0);
  float fr = pow(1.0 - ndv, 2.55);
  float n = n3(vP * 1.05);
  vec3 graphite = vec3(0.055, 0.062, 0.072);
  vec3 silver = vec3(0.90, 0.915, 0.94);
  vec3 col = graphite * (0.82 + 0.18 * n * (0.25 + uAct * 0.4));
  col += mix(silver, uA, 0.28) * fr * (1.15 + uH * 0.35);
  col += uS * fr * 0.08;
  float a = uAlpha * (0.92 + 0.08 * fr);
  gl_FragColor = vec4(col, a);
}
`;
