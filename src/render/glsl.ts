// WebGL2 (GLSL ES 3.00) shaders for the animated line + noise effect.

export const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Ashima Arts 4D simplex noise (webgl-noise, MIT). 4D lets us evolve the
// noise field around a circle so the animation loops perfectly.
const SNOISE_4D = `
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
float mod289(float x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
float permute(float x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float taylorInvSqrt(float r){return 1.79284291400159-0.85373472095314*r;}
vec4 grad4(float j, vec4 ip){
  const vec4 ones=vec4(1.0,1.0,1.0,-1.0);
  vec4 p,s;
  p.xyz=floor(fract(vec3(j)*ip.xyz)*7.0)*ip.z-1.0;
  p.w=1.5-dot(abs(p.xyz),ones.xyz);
  s=vec4(lessThan(p,vec4(0.0)));
  p.xyz=p.xyz+(s.xyz*2.0-1.0)*s.www;
  return p;
}
float snoise(vec4 v){
  const vec4 C=vec4(0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958);
  vec4 i=floor(v+dot(v,vec4(0.309016994374947451)));
  vec4 x0=v-i+dot(i,C.xxxx);
  vec4 i0;
  vec3 isX=step(x0.yzw,x0.xxx);
  vec3 isYZ=step(x0.zww,x0.yyz);
  i0.x=isX.x+isX.y+isX.z;
  i0.yzw=1.0-isX;
  i0.y+=isYZ.x+isYZ.y;
  i0.zw+=1.0-isYZ.xy;
  i0.z+=isYZ.z;
  i0.w+=1.0-isYZ.z;
  vec4 i3=clamp(i0,0.0,1.0);
  vec4 i2=clamp(i0-1.0,0.0,1.0);
  vec4 i1=clamp(i0-2.0,0.0,1.0);
  vec4 x1=x0-i1+C.xxxx;
  vec4 x2=x0-i2+C.yyyy;
  vec4 x3=x0-i3+C.zzzz;
  vec4 x4=x0+C.wwww;
  i=mod289(i);
  float j0=permute(permute(permute(permute(i.w)+i.z)+i.y)+i.x);
  vec4 j1=permute(permute(permute(permute(
    i.w+vec4(i1.w,i2.w,i3.w,1.0))
    +i.z+vec4(i1.z,i2.z,i3.z,1.0))
    +i.y+vec4(i1.y,i2.y,i3.y,1.0))
    +i.x+vec4(i1.x,i2.x,i3.x,1.0));
  vec4 ip=vec4(1.0/294.0,1.0/49.0,1.0/7.0,0.0);
  vec4 p0=grad4(j0,ip);
  vec4 p1=grad4(j1.x,ip);
  vec4 p2=grad4(j1.y,ip);
  vec4 p3=grad4(j1.z,ip);
  vec4 p4=grad4(j1.w,ip);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  p4*=taylorInvSqrt(dot(p4,p4));
  vec3 m0=max(0.6-vec3(dot(x0,x0),dot(x1,x1),dot(x2,x2)),0.0);
  vec2 m1=max(0.6-vec2(dot(x3,x3),dot(x4,x4)),0.0);
  m0=m0*m0;m1=m1*m1;
  return 49.0*(dot(m0*m0,vec3(dot(p0,x0),dot(p1,x1),dot(p2,x2)))
    +dot(m1*m1,vec2(dot(p3,x3),dot(p4,x4))));
}`;

export const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform vec2  uResolution;
uniform float uPhase;         // 0..2PI loop position
uniform float uTime;          // seconds (grain flicker)
uniform sampler2D uBase;      // baked background + text
uniform sampler2D uMask;      // text-reveal field (r channel)

uniform float uBarCount;
uniform float uBarThickness;  // 0..1 (1 = no gap)
uniform float uBarWidth;      // 0..1
uniform float uCellDensity;   // cells per row
uniform float uAngleX;        // radians (shear)
uniform float uAngleY;        // radians (rotate)
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform float uGradFreq;      // gradient frequency inside a cell
uniform float uSpeed;         // loop radius (flow / temporal variety)
uniform float uColorIntensity;// glass warp amount
uniform float uBarOpacity;
uniform float uAlphaScale;
uniform float uTextReveal;    // 0 = everywhere, 1 = only around text

uniform float uGrainScale;
uniform float uGrainOpacity;

${SNOISE_4D}

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float hash11(float p){
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

void main(){
  vec2 uv = vUv;
  vec3 base = texture(uBase, uv).rgb;

  float aspect = uResolution.x / uResolution.y;

  // --- field coordinate space (shear on X, rotate on Y) ---
  vec2 c = uv - 0.5;
  c.x *= aspect;
  c.x += tan(uAngleX) * c.y;
  float s = sin(uAngleY), co = cos(uAngleY);
  c = mat2(co, -s, s, co) * c;
  vec2 q = c;
  q.x /= aspect;
  q += 0.5;

  vec2 loop = uSpeed * vec2(cos(uPhase), sin(uPhase));

  // --- rows (horizontal lines). thickness 1.0 => no gap between rows ---
  float row = q.y * uBarCount;
  float ri = floor(row);
  float rf = fract(row);
  float aaY = fwidth(row) * 1.1 + 1e-4;
  float rowMask = uBarThickness >= 0.999
    ? 1.0
    : smoothstep(0.0, aaY, rf) - smoothstep(uBarThickness, uBarThickness + aaY, rf);

  // horizontal width limit (centered), disabled when full width
  float halfw = uBarWidth * 0.5;
  float edge = fwidth(q.x) * 1.25 + 0.002;
  float wmask = smoothstep(0.5 - halfw - edge, 0.5 - halfw + edge, q.x)
              * (1.0 - smoothstep(0.5 + halfw - edge, 0.5 + halfw + edge, q.x));
  rowMask *= mix(wmask, 1.0, step(0.999, uBarWidth));

  // --- cells: each row is split into rectangular cells (fractal glass) ---
  float rowSeed = hash11(ri + 0.5);
  float cxf = q.x * uCellDensity + rowSeed * 7.0;   // per-row offset -> staggered seams
  float ci = floor(cxf);
  float lx = fract(cxf);                            // local x within the cell (0..1)
  vec2 cellId = vec2(ci, ri);
  float cs = hash21(cellId + 1.7);

  // Each cell owns an independent horizontal gradient that flows & drifts in time.
  float drift = snoise(vec4(cellId * 1.7, loop));                 // per-cell color drift
  float warp  = snoise(vec4(q * uGradFreq * 3.0, loop)) * uColorIntensity; // glass warp
  float gpos  = 0.5 + 0.5 * sin(
      6.2831853 * lx * uGradFreq * 0.5      // gradient across the cell
    + drift * 6.2831853                     // animated flow + per-cell phase
    + warp  * 3.14159);                      // glassy distortion
  vec3 lineCol = mix(uColorA, uColorB, clamp(gpos, 0.0, 1.0));

  // --- transparency map: evolving random alpha per cell/line ---
  float an = snoise(vec4(q * uAlphaScale + cellId * 0.13, loop)) * 0.5 + 0.5;
  an = smoothstep(0.05, 0.95, an);

  // --- fade gate: lines cover the whole screen, fading out over the text ---
  float field = texture(uMask, uv).r;      // soft blob, ~1 over the text center
  float gate = clamp(1.0 - uTextReveal * field, 0.0, 1.0);

  float alpha = rowMask * an * uBarOpacity * gate;
  vec3 col = mix(base, lineCol, alpha);

  // --- film grain overlay (density + opacity) ---
  float grain = hash21(gl_FragCoord.xy * (uGrainScale + 0.05) + fract(uTime) * 311.7);
  col += (grain - 0.5) * uGrainOpacity;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;
