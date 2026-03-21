/**
 * useClickSound — generates a soft click via Web Audio API.
 * No external file needed. Zero latency.
 */
export function useClickSound() {
  const play = (freq = 800, duration = 0.045, volume = 0.12) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);

      // Auto-close AudioContext to avoid leaking resources
      osc.onended = () => ctx.close();
    } catch {
      // Silently fail if AudioContext not supported
    }
  };

  return play;
}
