export const fresnelVert = `
varying vec3 vN;
varying vec3 vW;
void main() {
  vN = normalize(normalMatrix * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const fresnelFrag = `
uniform vec3 uAccent;
uniform vec3 uSilver;
uniform float uAmp;
uniform float uAlpha;
varying vec3 vN;
varying vec3 vW;
void main() {
  vec3 v = normalize(cameraPosition - vW);
  float ndv = max(dot(normalize(vN), v), 0.0);
  float fr = pow(1.0 - ndv, 2.65);
  float tight = pow(1.0 - ndv, 5.4);
  vec3 col = uSilver * fr * 1.15 + uAccent * tight * uAmp;
  float a = uAlpha * (0.035 + 0.78 * fr);
  gl_FragColor = vec4(col, a);
}
`;
