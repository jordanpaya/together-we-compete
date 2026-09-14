/* Together We Compete — hero shader panel.
   Raw WebGL, no dependencies. Grainy, slowly warping gradient in the brand
   palette. Tap or click the panel to send out a ripple.
   Pauses when off screen or when the tab is hidden. Renders one still frame
   if the visitor prefers reduced motion. If WebGL is unavailable the panel
   keeps its CSS background. */
(function () {
  "use strict";

  var canvas = document.getElementById("hero-shader");
  if (!canvas) return;

  var gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return;

  var vertexSrc = [
    "attribute vec2 position;",
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = position * 0.5 + 0.5;",
    "  gl_Position = vec4(position, 0.0, 1.0);",
    "}"
  ].join("\n");

  var fragmentSrc = [
    "precision highp float;",
    "uniform vec2 iResolution;",
    "uniform float iTime;",
    "uniform float ripplePositions[20];",
    "uniform float rippleTimes[10];",
    "uniform int rippleCount;",
    "varying vec2 vUv;",

    // Tuning
    "const float noiseIntensity = 1.55;",
    "const float noiseScale = 2.0;",
    "const float noiseSpeed = 0.15;",
    "const float waveNoiseIntensity = 1.2;",
    "const float waveNoiseScale1 = 0.5;",
    "const float waveNoiseScale2 = 0.8;",
    "const float waveNoiseScale3 = 1.2;",
    "const float waveNoiseSpeed1 = 0.24;",
    "const float waveNoiseSpeed2 = 0.2;",
    "const float waveNoiseSpeed3 = 0.3;",
    "const float GRAIN_SPEED = 2.0;",
    "const float GRAIN_INTENSITY = 0.075;",

    "vec2 hash(vec2 p) {",
    "  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));",
    "  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);",
    "}",

    "float noise(vec2 p) {",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(",
    "    mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),",
    "        dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),",
    "    mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),",
    "        dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),",
    "    u.y);",
    "}",

    "vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }",
    "vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }",
    "vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }",
    "vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }",

    "float snoise(vec3 v) {",
    "  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);",
    "  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);",
    "  vec3 i = floor(v + dot(v, C.yyy));",
    "  vec3 x0 = v - i + dot(i, C.xxx);",
    "  vec3 g = step(x0.yzx, x0.xyz);",
    "  vec3 l = 1.0 - g;",
    "  vec3 i1 = min(g.xyz, l.zxy);",
    "  vec3 i2 = max(g.xyz, l.zxy);",
    "  vec3 x1 = x0 - i1 + C.xxx;",
    "  vec3 x2 = x0 - i2 + C.yyy;",
    "  vec3 x3 = x0 - D.yyy;",
    "  i = mod289(i);",
    "  vec4 p = permute(permute(permute(",
    "    i.z + vec4(0.0, i1.z, i2.z, 1.0))",
    "    + i.y + vec4(0.0, i1.y, i2.y, 1.0))",
    "    + i.x + vec4(0.0, i1.x, i2.x, 1.0));",
    "  float n_ = 0.142857142857;",
    "  vec3 ns = n_ * D.wyz - D.xzx;",
    "  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);",
    "  vec4 x_ = floor(j * ns.z);",
    "  vec4 y_ = floor(j - 7.0 * x_);",
    "  vec4 x = x_ * ns.x + ns.yyyy;",
    "  vec4 y = y_ * ns.x + ns.yyyy;",
    "  vec4 h = 1.0 - abs(x) - abs(y);",
    "  vec4 b0 = vec4(x.xy, y.xy);",
    "  vec4 b1 = vec4(x.zw, y.zw);",
    "  vec4 s0 = floor(b0) * 2.0 + 1.0;",
    "  vec4 s1 = floor(b1) * 2.0 + 1.0;",
    "  vec4 sh = -step(h, vec4(0.0));",
    "  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;",
    "  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;",
    "  vec3 p0 = vec3(a0.xy, h.x);",
    "  vec3 p1 = vec3(a0.zw, h.y);",
    "  vec3 p2 = vec3(a1.xy, h.z);",
    "  vec3 p3 = vec3(a1.zw, h.w);",
    "  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));",
    "  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;",
    "  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);",
    "  m = m * m;",
    "  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));",
    "}",

    "vec2 warp(vec2 p) {",
    "  float n1 = noise(p * waveNoiseScale1 + vec2(iTime * waveNoiseSpeed1, 0.0));",
    "  float n2 = noise(p * waveNoiseScale1 + vec2(0.0, iTime * waveNoiseSpeed2));",
    "  float n3 = noise(p * waveNoiseScale2 + vec2(iTime * -waveNoiseSpeed3, iTime * waveNoiseSpeed3)) * 0.5;",
    "  float n4 = noise(p * waveNoiseScale3 + vec2(iTime * waveNoiseSpeed3, -iTime * waveNoiseSpeed3)) * 0.3;",
    "  return p + vec2(n1 + n3, n2 + n4) * waveNoiseIntensity;",
    "}",

    "float calculateRipples(vec2 uv) {",
    "  float rippleEffect = 0.0;",
    "  for (int i = 0; i < 10; i++) {",
    "    if (i >= rippleCount) break;",
    "    vec2 ripplePos = vec2(ripplePositions[i * 2], ripplePositions[i * 2 + 1]);",
    "    float rippleTime = rippleTimes[i];",
    "    float dist = distance(uv, ripplePos);",
    "    float rippleRadius = rippleTime * 1.0;",
    "    float rippleWidth = 0.05;",
    "    float ring = smoothstep(rippleRadius + rippleWidth, rippleRadius, dist) *",
    "                 smoothstep(rippleRadius - rippleWidth, rippleRadius, dist);",
    "    float fadeOut = 1.0 - smoothstep(0.0, 2.0, rippleTime);",
    "    float wave = sin(dist * 15.0 - rippleTime * 8.0) * 0.5 + 0.5;",
    "    rippleEffect += ring * fadeOut * wave * 0.3;",
    "  }",
    "  return rippleEffect;",
    "}",

    "float gaussian(float z, float u, float o) {",
    "  return (1.0 / (o * sqrt(2.0 * 3.1415))) * exp(-(((z - u) * (z - u)) / (2.0 * (o * o))));",
    "}",

    "vec3 channel_mix(vec3 a, vec3 b, vec3 w) {",
    "  return vec3(mix(a.r, b.r, w.r), mix(a.g, b.g, w.g), mix(a.b, b.b, w.b));",
    "}",

    "vec3 overlay(vec3 a, vec3 b, float w) {",
    "  return mix(a, channel_mix(",
    "    2.0 * a * b,",
    "    vec3(1.0) - 2.0 * (vec3(1.0) - a) * (vec3(1.0) - b),",
    "    step(vec3(0.5), a)", 
    "  ), w);",
    "}",

    "vec3 applyGrain(vec3 color, vec2 uv) {",
    "  float t = iTime * GRAIN_SPEED;",
    "  float seed = dot(uv, vec2(12.9898, 78.233));",
    "  float grainNoise = fract(sin(seed) * 43758.5453 + t);",
    "  grainNoise = gaussian(grainNoise, 0.0, 0.25);",
    "  vec3 grain = vec3(grainNoise) * (1.0 - color);",
    "  return overlay(color, grain, GRAIN_INTENSITY);",
    "}",

    // Brand palette: off-white -> warm neutral -> orange -> blue -> ink
    "vec3 palette(float t) {",
    "  vec3 c0 = vec3(0.984, 0.980, 0.969);",
    "  vec3 c1 = vec3(0.925, 0.918, 0.890);",
    "  vec3 c2 = vec3(1.000, 0.416, 0.239);",
    "  vec3 c3 = vec3(0.122, 0.369, 1.000);",
    "  vec3 c4 = vec3(0.078, 0.086, 0.102);",
    "  t = clamp(t, 0.0, 1.0);",
    "  vec3 c = mix(c0, c1, smoothstep(0.00, 0.22, t));",
    "  c = mix(c, c2, smoothstep(0.22, 0.50, t));",
    "  c = mix(c, c3, smoothstep(0.50, 0.78, t));",
    "  c = mix(c, c4, smoothstep(0.78, 1.00, t));",
    "  return c;",
    "}",

    "void main() {",
    "  vec2 I = vUv * iResolution;",
    "  vec2 uv = (I - 0.5 * iResolution) / iResolution.y;",
    "  vec2 warpedUv = warp(uv);",
    "  float simplexNoise = snoise(vec3(warpedUv * noiseScale, iTime * noiseSpeed)) * noiseIntensity;",
    "  warpedUv += simplexNoise;",
    "  float phase1 = iTime * 0.6;",
    "  float phase2 = iTime * 0.4;",
    "  float distanceFromCenter = length(warpedUv);",
    "  float archFactor = 1.0 - distanceFromCenter * 0.5;",
    "  float wave1 = sin(warpedUv.x * 3.0 + phase1) * 0.5 * archFactor;",
    "  float wave2 = sin(warpedUv.x * 5.0 - phase2) * 0.3 * archFactor;",
    "  float wave3 = sin(warpedUv.y * 4.0 + phase1 * 0.7) * 0.15;",
    "  float parabolicArch = -pow(warpedUv.x, 2.0) * 0.2;",
    "  float breathing = sin(iTime * 0.5) * 0.1 + 0.9;",
    "  float combinedWave = (wave1 + wave2 + wave3 + parabolicArch) * breathing * 0.3;",
    "  float ripples = calculateRipples(uv);",
    "  float gradientPos = vUv.y + combinedWave * 0.3 + ripples * 0.2;",
    "  float g = smoothstep(0.0, 1.0, clamp(1.0 - gradientPos, 0.0, 1.0));",
    "  vec3 color = palette(g);",
    "  color += vec3(ripples * 0.3);",
    "  gl_FragColor = vec4(applyGrain(color, vUv), 1.0);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("Shader compile error:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, vertexSrc);
  var fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
  if (!vs || !fs) return;

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Shader link error:", gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);

  // One triangle that covers the whole canvas.
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var positionLoc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  var u = {
    iResolution: gl.getUniformLocation(program, "iResolution"),
    iTime: gl.getUniformLocation(program, "iTime"),
    ripplePositions: gl.getUniformLocation(program, "ripplePositions"),
    rippleTimes: gl.getUniformLocation(program, "rippleTimes"),
    rippleCount: gl.getUniformLocation(program, "rippleCount")
  };

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var ripples = [];
  var positions = new Float32Array(20);
  var times = new Float32Array(10);
  var start = performance.now();
  var visible = true;
  var rafId = 0;
  var width = 0;
  var height = 0;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w !== width || h !== height) {
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function render(time) {
    resize();
    var count = 0;
    for (var i = 0; i < ripples.length && count < 10; i++) {
      var age = time - ripples[i].t;
      if (age < 2.0) {
        positions[count * 2] = ripples[i].x;
        positions[count * 2 + 1] = ripples[i].y;
        times[count] = age;
        count++;
      }
    }
    ripples = ripples.filter(function (r) { return time - r.t < 2.0; });

    gl.uniform2f(u.iResolution, width, height);
    gl.uniform1f(u.iTime, time);
    gl.uniform1fv(u.ripplePositions, positions);
    gl.uniform1fv(u.rippleTimes, times);
    gl.uniform1i(u.rippleCount, count);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function now() { return (performance.now() - start) / 1000; }

  function loop() {
    rafId = 0;
    if (!visible || document.hidden || reducedMotion.matches) return;
    render(now());
    rafId = requestAnimationFrame(loop);
  }

  function wake() {
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  // Ripple on tap or click. Coordinates match the shader's aspect-corrected space.
  canvas.addEventListener("pointerdown", function (e) {
    if (reducedMotion.matches) return;
    var rect = canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) / rect.width;
    var py = (e.clientY - rect.top) / rect.height;
    var aspect = rect.width / rect.height;
    ripples.push({ x: (px - 0.5) * aspect, y: 0.5 - py, t: now() });
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) wake();
    }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) wake(); });
  reducedMotion.addEventListener && reducedMotion.addEventListener("change", function () {
    if (reducedMotion.matches) render(0); else wake();
  });
  if ("ResizeObserver" in window) {
    new ResizeObserver(function () { if (reducedMotion.matches) render(0); }).observe(canvas);
  }

  // First frame, always. Then animate unless the visitor asked for less motion.
  render(0);
  canvas.classList.add("is-ready");
  wake();
})();
