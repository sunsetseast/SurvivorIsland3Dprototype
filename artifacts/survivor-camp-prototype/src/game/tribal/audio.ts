/** Original synthesized ambience, opt-in from a user gesture. No media downloads/autoplay. */
class TribalAudio {
  context: AudioContext | null = null;
  private nodes: AudioNode[] = [];
  private fire: GainNode | null = null;
  private enabled = false;
  async start(): Promise<boolean> {
    try {
      if (!this.context || this.context.state === "closed")
        this.context = new AudioContext();
      await this.context.resume();
      if (this.enabled) return true;
      const c = this.context,
        buffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate),
        data = buffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < data.length; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.025) / 1.02;
        data[i] = brown * 3 + (Math.random() > 0.999 ? Math.random() * 0.7 : 0);
      }
      const noise = c.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      this.fire = c.createGain();
      this.fire.gain.value = 0.02;
      noise.connect(filter).connect(this.fire).connect(c.destination);
      noise.start();
      this.nodes.push(noise, filter, this.fire);
      for (let i = 0; i < 3; i++) {
        const insect = c.createOscillator(),
          gain = c.createGain(),
          pulse = c.createOscillator(),
          amount = c.createGain();
        insect.frequency.value = 3100 + i * 641;
        gain.gain.value = 0.0017;
        pulse.frequency.value = 3.7 + i * 1.3;
        amount.gain.value = 0.0015;
        pulse.connect(amount).connect(gain.gain);
        insect.connect(gain).connect(c.destination);
        insect.start();
        pulse.start();
        this.nodes.push(insect, gain, pulse, amount);
      }
      this.enabled = true;
      return true;
    } catch {
      this.stop();
      return false;
    }
  }
  update(x: number, z: number, _dt: number) {
    if (!this.enabled || !this.context || !this.fire) return;
    this.fire.gain.setTargetAtTime(
      0.012 + 0.12 / (1 + Math.hypot(x, z) * 0.25),
      this.context.currentTime,
      0.3,
    );
  }
  stop() {
    for (const n of this.nodes) {
      if ("stop" in n)
        try {
          (n as AudioScheduledSourceNode).stop();
        } catch {
          /* already stopped */
        }
      n.disconnect();
    }
    this.nodes = [];
    this.fire = null;
    this.enabled = false;
    if (this.context) {
      void this.context.close().catch(() => {});
      this.context = null;
    }
  }
}
export const tribalAudio = new TribalAudio();
