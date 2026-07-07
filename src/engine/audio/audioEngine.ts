import type { PhysicsSnapshot } from '@/engine/physics/types';

type AudioGraph = {
  context: AudioContext;
  engine: OscillatorNode;
  harmonic: OscillatorNode;
  intake: OscillatorNode;
  noise: AudioBufferSourceNode;
  master: GainNode;
  engineGain: GainNode;
  harmonicGain: GainNode;
  noiseGain: GainNode;
  panner: PannerNode;
  filter: BiquadFilterNode;
};

function makeNoiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * 1.5, context.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * 0.55;
  }
  return buffer;
}

export function createAudioEngine() {
  let graph: AudioGraph | null = null;

  const ensure = () => {
    if (graph) return;
    const context = new AudioContext({ latencyHint: 'interactive' });
    const engine = context.createOscillator();
    const harmonic = context.createOscillator();
    const intake = context.createOscillator();
    const noise = context.createBufferSource();
    const master = context.createGain();
    const engineGain = context.createGain();
    const harmonicGain = context.createGain();
    const noiseGain = context.createGain();
    const panner = context.createPanner();
    const filter = context.createBiquadFilter();

    engine.type = 'sawtooth';
    harmonic.type = 'triangle';
    intake.type = 'square';
    noise.buffer = makeNoiseBuffer(context);
    noise.loop = true;

    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = 32;
    panner.rolloffFactor = 1.2;
    panner.positionX.value = 0;
    panner.positionY.value = -0.25;
    panner.positionZ.value = -1.8;

    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.7;

    master.gain.value = 0.0001;
    engineGain.gain.value = 0.0001;
    harmonicGain.gain.value = 0.0001;
    noiseGain.gain.value = 0.0001;

    engine.connect(engineGain).connect(filter);
    harmonic.connect(harmonicGain).connect(filter);
    intake.connect(engineGain);
    noise.connect(noiseGain).connect(filter);
    filter.connect(panner).connect(master).connect(context.destination);

    engine.start();
    harmonic.start();
    intake.start();
    noise.start();

    graph = { context, engine, harmonic, intake, noise, master, engineGain, harmonicGain, noiseGain, panner, filter };
  };

  const resumeOnGesture = () => {
    ensure();
    void graph?.context.resume();
    window.removeEventListener('pointerdown', resumeOnGesture);
    window.removeEventListener('keydown', resumeOnGesture);
  };

  window.addEventListener('pointerdown', resumeOnGesture, { once: true });
  window.addEventListener('keydown', resumeOnGesture, { once: true });

  return {
    update(snapshot: PhysicsSnapshot) {
      if (!graph) return;
      const now = graph.context.currentTime;
      const rpmFactor = Math.max(0, Math.min(1, (snapshot.rpm - 850) / (7800 - 850)));
      const baseFrequency = 32 + snapshot.rpm / 42;
      const load = snapshot.throttle * (1 - snapshot.clutch * 0.65);
      const roadNoise = Math.max(0, Math.min(1, snapshot.surfaceRoughness + Math.abs(snapshot.slipRatio) * 0.5));

      graph.engine.frequency.setTargetAtTime(baseFrequency, now, 0.035);
      graph.harmonic.frequency.setTargetAtTime(baseFrequency * 1.5, now, 0.045);
      graph.intake.frequency.setTargetAtTime(baseFrequency * 0.5, now, 0.06);
      graph.engineGain.gain.setTargetAtTime(0.018 + load * 0.042, now, 0.05);
      graph.harmonicGain.gain.setTargetAtTime(0.006 + rpmFactor * 0.026, now, 0.05);
      graph.noiseGain.gain.setTargetAtTime(roadNoise * 0.014 + Math.abs(snapshot.lateralG) * 0.01, now, 0.08);
      graph.filter.frequency.setTargetAtTime(900 + rpmFactor * 3200 + load * 900, now, 0.06);
      graph.master.gain.setTargetAtTime(0.22, now, 0.18);
      graph.panner.positionX.setTargetAtTime(Math.max(-1.8, Math.min(1.8, -snapshot.steering * 0.65 + snapshot.lateralG * 0.2)), now, 0.08);
    },
    dispose() {
      window.removeEventListener('pointerdown', resumeOnGesture);
      window.removeEventListener('keydown', resumeOnGesture);
      if (!graph) return;
      const { context, engine, harmonic, intake, noise, master } = graph;
      master.gain.setTargetAtTime(0.0001, context.currentTime, 0.02);
      engine.stop(context.currentTime + 0.04);
      harmonic.stop(context.currentTime + 0.04);
      intake.stop(context.currentTime + 0.04);
      noise.stop(context.currentTime + 0.04);
      void context.close();
      graph = null;
    }
  };
}
