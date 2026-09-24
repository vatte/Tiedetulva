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

// must be called from a user gesture (e.g. a click) for the browser to allow audio
export const initAudio = async () => {
  if (context !== null) {
    await context.resume();
    return;
  }
  context = new AudioContext();
  master = context.createGain();
  master.gain.value = SOUND.MASTER_VOLUME;
  master.connect(context.destination);
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

const playNoiseLayer = (
  layer: (typeof SOUND.LAYERS)[number],
  destination: AudioNode,
  volume: number,
  timeScale: number
) => {
  const start = context!.currentTime + layer.delay * timeScale;
  const peak = start + layer.attack * timeScale;
  const end = peak + layer.decay * timeScale;

  const source = context!.createBufferSource();
  source.buffer = noise;
  source.loop = true;

  const filter = context!.createBiquadFilter();
  filter.type = layer.filter;
  filter.frequency.setValueAtTime(layer.freqStart, start);
  filter.frequency.exponentialRampToValueAtTime(layer.freqPeak, peak);
  filter.frequency.exponentialRampToValueAtTime(layer.freqEnd, end);

  const gain = context!.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(layer.level * volume, peak);
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

  const volume = 1 - Math.random() * SOUND.VOLUME_RANDOMNESS;

  if (samples.length > 0) {
    playSample(panner, volume);
    return;
  }

  const timeScale = 1 + (Math.random() * 2 - 1) * SOUND.DURATION_RANDOMNESS;
  for (const layer of SOUND.LAYERS) {
    playNoiseLayer(layer, panner, volume, timeScale);
  }
};
