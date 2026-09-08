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
  return sin(p.x * 3.1 + uT) * sin(p.y * 2.7 - uT * 0.7) * sin(p.z * 3.3 + uT * 0.5) * 0.5 + 0.5;
}
void main() {
  vec3 v = normalize(cameraPosition - vW);
  float fr = pow(1.0 - max(dot(vN, v), 0.0), 2.05);
  float n = n3(vP * 1.15 + vec3(uT * 0.03));
  vec3 col = uA * (0.025 + 0.08 * n * (0.12 + uAct)) + uA * fr * (1.35 + uH * 0.32) + uS * fr * 0.18 + vec3(0.018, 0.02, 0.024);
  float a = uAlpha * (0.1 + 0.78 * fr);
  gl_FragColor = vec4(col, a);
}
`;
