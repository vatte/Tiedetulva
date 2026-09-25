import { SOUND } from "./params";

let context: AudioContext | null = null;
let master: GainNode;
let noise: AudioBuffer;
const samples: AudioBuffer[] = [];

// pink noise (Paul Kellet's filter), the raw material of the synthesized waves
const makeNoiseBuffer = (context: AudioContext, seconds: number) => {
  const buffer = context.createBuffer(
    1,
    seconds * context.sampleRate,
    context.sampleRate
  );
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
};

// soft clipping curve, normalized so full scale in = full scale out
const makeDistortionCurve = (drive: number) => {
  const n = 4096;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
};

// master -> clean + (waveshaper -> tone filter) -> destination
const makeDistortion = (context: AudioContext, input: AudioNode) => {
  const { DRIVE, MIX, TONE } = SOUND.DISTORTION;
  if (DRIVE <= 0) {
    input.connect(context.destination);
    return;
  }
  const dry = context.createGain();
  dry.gain.value = 1 - MIX;
  input.connect(dry).connect(context.destination);

  const shaper = context.createWaveShaper();
  shaper.curve = makeDistortionCurve(DRIVE);
  shaper.oversample = "4x";
  const tone = context.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = TONE;
  const wet = context.createGain();
  wet.gain.value = MIX;
  input.connect(shaper).connect(tone).connect(wet).connect(context.destination);
};

// must be called from a user gesture (e.g. a click) for the browser to allow audio
export const initAudio = async () => {
  if (context !== null) {
    await context.resume();
    return;
  }
  context = new AudioContext();
  master = context.createGain();
  master.gain.value = SOUND.MASTER_VOLUME;
  makeDistortion(context, master);
  noise = makeNoiseBuffer(context, 5);

  for (const file of SOUND.SAMPLE_FILES) {
    try {
      const response = await fetch(file);
      samples.push(await context.decodeAudioData(await response.arrayBuffer()));
    } catch (e) {
      console.log("Could not load wave sound " + file, e);
    }
  }
};

const playSample = (destination: AudioNode, volume: number) => {
  const source = context!.createBufferSource();
  source.buffer = samples[Math.floor(Math.random() * samples.length)];
  source.playbackRate.value =
    1 + (Math.random() * 2 - 1) * SOUND.SAMPLE_PITCH_RANDOMNESS;
  const gain = context!.createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(destination);
  source.start();
};

type Layer = (typeof SOUND.LAYERS)[number];

// random number between -amount and amount
const spread = (amount: number) => (Math.random() * 2 - 1) * amount;

// size from 0 (smallest wave) to 1 (biggest)
const playNoiseLayer = (
  layer: Layer,
  destination: AudioNode,
  volume: number,
  size: number,
  delayOffset = 0
) => {
  const timeScale = 1 + (size * 2 - 1) * SOUND.DURATION_RANDOMNESS;
  const time = (seconds: number) =>
    seconds * timeScale * (1 + spread(SOUND.TIMING_RANDOMNESS));
  const start = context!.currentTime + delayOffset + time(layer.delay);
  const peak = start + time(layer.attack);
  const end = peak + time(layer.decay);

  const octaves = (1 - size * 2) * layer.sizePitch + spread(SOUND.FREQ_RANDOMNESS);
  const freqScale = Math.pow(2, octaves);
  const freq = (hz: number) => Math.min(hz * freqScale, context!.sampleRate / 2 - 1);

  const source = context!.createBufferSource();
  source.buffer = noise;
  source.loop = true;

  const filter = context!.createBiquadFilter();
  filter.type = layer.filter;
  if (layer.resonant) filter.Q.value = 1 + Math.random() * SOUND.Q_RANDOMNESS;
  filter.frequency.setValueAtTime(freq(layer.freqStart), start);
  filter.frequency.exponentialRampToValueAtTime(freq(layer.freqPeak), peak);
  filter.frequency.exponentialRampToValueAtTime(freq(layer.freqEnd), end);

  const level = layer.level * volume * (1 - Math.random() * SOUND.LEVEL_RANDOMNESS);
  const gain = context!.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(level, peak);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  source.connect(filter).connect(gain).connect(destination);
  source.start(start, Math.random() * noise.duration);
  source.stop(end + 0.1);
};

// the sound of a breaking wave, pan from -1 (left) to 1 (right)
export const playWaveSound = (pan: number) => {
  if (context === null) return;

  const panner = context.createStereoPanner();
  panner.pan.value = pan * SOUND.STEREO_WIDTH;
  panner.connect(master);

  const size = Math.random();
  const volume = 1 - (1 - size) * SOUND.VOLUME_RANDOMNESS;

  if (samples.length > 0) {
    playSample(panner, volume);
    return;
  }

  for (const layer of SOUND.LAYERS) {
    playNoiseLayer(layer, panner, volume, size);
  }

  if (Math.random() < SOUND.DOUBLE_BREAK_CHANCE) {
    const [minDelay, maxDelay] = SOUND.DOUBLE_BREAK_DELAY;
    playNoiseLayer(
      SOUND.LAYERS[0],
      panner,
      volume * SOUND.DOUBLE_BREAK_LEVEL,
      size * Math.random(),
      minDelay + Math.random() * (maxDelay - minDelay)
    );
  }
};
