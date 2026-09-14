/* Together We Compete — hero basketball.
   Raw WebGL, no dependencies. The ball is an analytic sphere drawn in the
   fragment shader; seams and pebble grain are computed from the surface
   normal, so there are no textures or model files.
   Drag or swipe to spin. Tap to flick it. Pauses off screen and when the
   tab is hidden. Reduced motion: no idle spin, but dragging still works. */
(function () {
  "use strict";

  var canvas = document.getElementById("hero-ball");
  if (!canvas) return;
  var gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" });
  if (!gl) return;
  var hasDeriv = !!gl.getExtension("OES_standard_derivatives");

  var vertexSrc = [
    "attribute vec2 position;",
    "varying vec2 vUv;",
    "void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }"
  ].join("\n");

  var fragmentSrc = [
    hasDeriv ? "#extension GL_OES_standard_derivatives : enable" : "",
    "precision highp float;",
    "uniform vec2 iResolution;",
    "uniform float iTime;",
    "uniform mat3 uRot;",           // world -> object space
    "varying vec2 vUv;",

    "const vec3 ORANGE = vec3(1.000, 0.416, 0.239);", // #ff6a3d
    "const vec3 INK    = vec3(0.078, 0.086, 0.102);", // #14161a
    "const float SEAM_ANGLE = 0.92;",  // curved seams: circles 52.7deg from the +/-x axis
    "const float SEAM_HALF  = 0.026;", // seam half-width, radians

    "float hash(vec3 p) {",
    "  p = fract(p * 0.3183099 + 0.1);",
    "  p *= 17.0;",
    "  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));",
    "}",
    "float noise(vec3 x) {",
    "  vec3 i = floor(x);",
    "  vec3 f = fract(x);",
    "  f = f * f * (3.0 - 2.0 * f);",
    "  return mix(",
    "    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),",
    "        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),",
    "    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),",
    "        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);",
    "}",

    // Angular distance (radians) to the nearest seam.
    // Two great circles (y = 0, x = 0) plus two small circles around +/-x.
    "float seamDist(vec3 n) {",
    "  float ax = clamp(abs(n.x), 0.0, 1.0);",
    "  float d1 = asin(clamp(abs(n.y), 0.0, 1.0));",
    "  float d2 = asin(ax);",
    "  float d3 = abs(acos(ax) - SEAM_ANGLE);",
    "  return min(min(d1, d2), d3);",
    "}",

    "float aaStep(float edge, float x) {",
    hasDeriv ? "  float w = fwidth(x) * 1.2;" : "  float w = 0.004;",
    "  return smoothstep(edge - w, edge + w, x);",
    "}",

    "void main() {",
    "  vec2 res = iResolution;",
    "  float m = min(res.x, res.y);",
    "  vec2 uv = (vUv * res - 0.5 * res) / m;",   // short axis spans -0.5..0.5

    // Transparent background with a soft contact shadow under the ball
    "  vec2 s = (uv - vec2(0.0, -0.395)) / vec2(0.30, 0.055);",
    "  float shadow = exp(-dot(s, s) * 1.1) * 0.18;",
    "  vec3 col = INK * shadow;",   // premultiplied
    "  float alpha = shadow;",

    // Ray toward a unit sphere at the origin, ball nudged up a little
    "  vec2 p = uv - vec2(0.0, 0.045);",
    "  vec3 ro = vec3(0.0, 0.0, 4.0);",
    "  vec3 rd = normalize(vec3(p * 0.76, -1.0));",
    "  float b = dot(ro, rd);",
    "  float h = b * b - (dot(ro, ro) - 1.0);",
    "  float cover = aaStep(0.0, h);",
    "  if (cover > 0.0) {",
    "    float t = -b - sqrt(max(h, 0.0));",
    "    vec3 pos = ro + rd * t;",
    "    vec3 n = normalize(pos);",
    "    vec3 on = uRot * n;",                    // object-space normal for seams and grain

    "    float d = seamDist(on);",
    "    float seam = 1.0 - aaStep(SEAM_HALF, d);",
    "    float bevel = smoothstep(SEAM_HALF, SEAM_HALF * 3.0, d);", // slight groove shading

    "    float grain = noise(on * 110.0) * 0.55 + noise(on * 230.0) * 0.45;",

    "    vec3 L1 = normalize(vec3(-0.55, 0.85, 0.95));",
    "    vec3 L2 = normalize(vec3(0.8, -0.3, 0.4));",
    "    float diff = max(dot(n, L1), 0.0);",
    "    float fill = max(dot(n, L2), 0.0) * 0.22;",
    "    float rim  = pow(1.0 - max(dot(n, -rd), 0.0), 3.5) * 0.30;",
    "    vec3  hv   = normalize(L1 - rd);",
    "    float spec = pow(max(dot(n, hv), 0.0), 38.0) * 0.22;",

    "    vec3 base = mix(ORANGE, INK, seam);",
    "    float light = 0.34 + diff * 0.78 + fill;",
    "    light *= 0.88 + 0.12 * bevel;",
    "    light *= 0.93 + 0.14 * grain;",
    "    vec3 ball = base * light + spec * (1.0 - seam) + rim * base * 0.6;",
    "    col = mix(col, ball, cover);",
    "    alpha = mix(alpha, 1.0, cover);",
    "  }",
    "  gl_FragColor = vec4(col, alpha);",
    "}"
  ].join("\n");

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("Ball shader:", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }
  var vs = compile(gl.VERTEX_SHADER, vertexSrc);
  var fs = compile(gl.FRAGMENT_SHADER, fragmentSrc);
  if (!vs || !fs) return;
  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("Ball shader link:", gl.getProgramInfoLog(program));
    return;
  }
  gl.useProgram(program);
  gl.clearColor(0, 0, 0, 0);

  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var positionLoc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  var uRes = gl.getUniformLocation(program, "iResolution");
  var uTime = gl.getUniformLocation(program, "iTime");
  var uRot = gl.getUniformLocation(program, "uRot");

  /* ---------- state ---------- */
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var IDLE_SPEED = 0.35;      // rad/s
  var yaw = 0.6, pitch = 0.42, roll = -0.22;
  var yawVel = IDLE_SPEED, pitchVel = 0;
  var dragging = false, moved = false, lastX = 0, lastY = 0, lastT = 0;
  var width = 0, height = 0, rafId = 0, visible = true, lastFrame = 0;
  var rot = new Float32Array(9);

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (w !== width || h !== height) {
      width = w; height = h;
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  // Object-from-world rotation = transpose of R = Rz(roll) * Rx(pitch) * Ry(yaw)
  function buildRot() {
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    var cx = Math.cos(pitch), sx = Math.sin(pitch);
    var cz = Math.cos(roll), sz = Math.sin(roll);
    // R = Rz * Rx * Ry (row-major math)
    var r00 = cz * cy - sz * sx * sy, r01 = -sz * cx, r02 = cz * sy + sz * sx * cy;
    var r10 = sz * cy + cz * sx * sy, r11 = cz * cx,  r12 = sz * sy - cz * sx * cy;
    var r20 = -cx * sy,               r21 = sx,       r22 = cx * cy;
    // GLSL mat3 is column-major; we want R^T, so store rows of R as columns.
    rot[0] = r00; rot[1] = r01; rot[2] = r02;
    rot[3] = r10; rot[4] = r11; rot[5] = r12;
    rot[6] = r20; rot[7] = r21; rot[8] = r22;
  }

  function render(t) {
    resize();
    buildRot();
    gl.uniform2f(uRes, width, height);
    gl.uniform1f(uTime, t);
    gl.uniformMatrix3fv(uRot, false, rot);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function step(now) {
    rafId = 0;
    var t = now / 1000;
    var dt = lastFrame ? Math.min(t - lastFrame, 0.05) : 0.016;
    lastFrame = t;

    if (!dragging) {
      var idle = reducedMotion.matches ? 0 : IDLE_SPEED;
      // Ease spin back toward the idle speed; pitch settles to rest.
      yawVel += (idle - yawVel) * (1 - Math.pow(0.02, dt));
      pitchVel *= Math.pow(0.03, dt);
      pitch += (0.42 - pitch) * (1 - Math.pow(0.15, dt));
    }
    yaw += yawVel * dt;
    pitch += pitchVel * dt;
    pitch = Math.max(-0.9, Math.min(0.9, pitch));

    render(t);

    var settled = !dragging && reducedMotion.matches &&
      Math.abs(yawVel) < 0.002 && Math.abs(pitchVel) < 0.002 && Math.abs(pitch - 0.42) < 0.002;
    if (visible && !document.hidden && !settled) rafId = requestAnimationFrame(step);
    else lastFrame = 0;
  }
  function wake() { if (!rafId) rafId = requestAnimationFrame(step); }

  /* ---------- input ---------- */
  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; moved = false;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("is-grabbing");
    wake();
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var now = performance.now();
    var dt = Math.max((now - lastT) / 1000, 0.004);
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    var k = 2.2 / Math.max(canvas.clientWidth, 1);   // px -> radians
    yaw += dx * k * 2.6;
    pitch += dy * k * 2.6;
    yawVel = (dx * k * 2.6) / dt;
    pitchVel = (dy * k * 2.6) / dt;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
  });
  function release(e) {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove("is-grabbing");
    if (!moved) yawVel += 7.0;               // tap: flick it
    yawVel = Math.max(-18, Math.min(18, yawVel));
    pitchVel = Math.max(-8, Math.min(8, pitchVel));
    wake();
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", function () { dragging = false; canvas.classList.remove("is-grabbing"); wake(); });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) wake();
    }, { threshold: 0 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) wake(); });
  if ("ResizeObserver" in window) new ResizeObserver(function () { wake(); }).observe(canvas);
  reducedMotion.addEventListener && reducedMotion.addEventListener("change", wake);

  render(0);
  canvas.classList.add("is-ready");
  wake();
})();
