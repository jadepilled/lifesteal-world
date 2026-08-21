type RadioVisualizer = {
  connectAudio: () => Promise<void>;
  destroy: () => void;
  setPalette: (colors: string[]) => void;
};

const vertexSource = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragmentSource = `#version 300 es
precision highp float;
out vec4 outputColor;
uniform vec2 resolution;
uniform float time;
uniform float energy;
uniform float bass;
uniform float treble;
uniform vec3 colorA;
uniform vec3 colorB;
uniform vec3 colorC;

float band(float value, float width) {
  return smoothstep(width, 0.0, abs(value));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
  float radius = length(uv);
  float angle = atan(uv.y, uv.x);
  float folds = 5.0 + floor(bass * 4.0);
  angle = abs(mod(angle * folds / 3.14159265 + 1.0, 2.0) - 1.0) * 3.14159265 / folds;
  vec2 kaleido = vec2(cos(angle), sin(angle)) * radius;

  float drift = time * (0.055 + energy * 0.11);
  float waveA = sin((kaleido.x * 8.0 + kaleido.y * 3.2) - drift * 11.0);
  float waveB = sin((radius * 20.0 - angle * 5.0) + drift * 7.0 + waveA * 1.4);
  float waveC = sin((kaleido.y * 12.0 - kaleido.x * 4.0) + drift * 5.0 + treble * 3.0);
  float lines = band(waveB, 0.075 + energy * 0.07) + band(waveC, 0.045 + treble * 0.04);
  float pulse = 0.5 + 0.5 * sin(radius * 13.0 - drift * 9.0);
  float vignette = smoothstep(1.55, 0.16, radius);
  float intensity = (0.06 + lines * (0.18 + energy * 0.76) + pulse * bass * 0.26) * vignette;

  vec3 gradient = mix(colorA, colorB, 0.5 + 0.5 * waveA);
  gradient = mix(gradient, colorC, clamp(lines * 0.42 + treble * 0.28, 0.0, 1.0));
  vec3 base = vec3(0.003, 0.004, 0.006) + colorA * 0.018;
  outputColor = vec4(base + gradient * intensity, 1.0);
}
`;

const parseHex = (value: string) => {
  const match = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (!match) return [1, 0.19, 0.31] as const;
  const source =
    match[1]!.length === 3 ? [...match[1]!].map((part) => part + part).join('') : match[1]!;
  return [0, 2, 4].map((offset) => Number.parseInt(source.slice(offset, offset + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
};

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return undefined;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return undefined;
  }
  return shader;
};

export const createRadioVisualizer = (
  canvas: HTMLCanvasElement,
  audio: HTMLAudioElement,
): RadioVisualizer | undefined => {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
    preserveDrawingBuffer: false,
  });
  if (!gl) return undefined;
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertex || !fragment) return undefined;
  const program = gl.createProgram();
  if (!program) return undefined;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return undefined;

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'resolution'),
    time: gl.getUniformLocation(program, 'time'),
    energy: gl.getUniformLocation(program, 'energy'),
    bass: gl.getUniformLocation(program, 'bass'),
    treble: gl.getUniformLocation(program, 'treble'),
    colors: ['colorA', 'colorB', 'colorC'].map((name) => gl.getUniformLocation(program, name)),
  };
  let palette = ['#ff304f', '#9127ff', '#f2a6ff'].map(parseHex);
  let frame = 0;
  let lastFrame = 0;
  let analyser: AnalyserNode | undefined;
  let audioContext: AudioContext | undefined;
  let audioSource: MediaElementAudioSourceNode | undefined;
  let frequencyData: Uint8Array<ArrayBuffer> | undefined;
  let destroyed = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.35);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  };

  const averageRange = (data: Uint8Array<ArrayBuffer>, from: number, to: number) => {
    let total = 0;
    const end = Math.min(to, data.length);
    for (let index = from; index < end; index += 1) total += data[index] ?? 0;
    return total / Math.max(1, end - from) / 255;
  };

  const draw = (timestamp: number) => {
    if (destroyed) return;
    frame = requestAnimationFrame(draw);
    if (document.hidden || timestamp - lastFrame < (reducedMotion ? 1000 : 33)) return;
    lastFrame = timestamp;
    resize();
    let energy = audio.paused ? 0.045 : 0.12;
    let bass = audio.paused ? 0.025 : 0.08;
    let treble = audio.paused ? 0.04 : 0.08;
    if (analyser && frequencyData) {
      analyser.getByteFrequencyData(frequencyData);
      bass = averageRange(frequencyData, 0, 18);
      treble = averageRange(frequencyData, 32, 94);
      energy = averageRange(frequencyData, 0, 110);
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, timestamp / 1000);
    gl.uniform1f(uniforms.energy, energy);
    gl.uniform1f(uniforms.bass, bass);
    gl.uniform1f(uniforms.treble, treble);
    palette.forEach((color, index) =>
      gl.uniform3f(uniforms.colors[index], color[0] ?? 1, color[1] ?? 0, color[2] ?? 0),
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const connectAudio = async () => {
    if (!audioContext) audioContext = new AudioContext();
    if (!audioSource) {
      audioSource = audioContext.createMediaElementSource(audio);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      audioSource.connect(analyser);
      analyser.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') await audioContext.resume();
  };

  const setPalette = (colors: string[]) => {
    const usable = colors.filter(Boolean).slice(0, 3);
    while (usable.length < 3) usable.push(usable[usable.length - 1] ?? '#ff304f');
    palette = usable.map(parseHex);
  };

  const destroy = () => {
    destroyed = true;
    cancelAnimationFrame(frame);
    audioSource?.disconnect();
    analyser?.disconnect();
    void audioContext?.close();
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
  };

  frame = requestAnimationFrame(draw);
  return { connectAudio, destroy, setPalette };
};
