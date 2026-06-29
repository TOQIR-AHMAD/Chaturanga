const soundCache = new Map<string, HTMLAudioElement>();

export function playSound(name: string, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  const base = window.__CHESS_MEDIA_BASE__;
  if (!base) {
    return;
  }

  const src = `${base}/sounds/${name}.wav`;
  let audio = soundCache.get(src);

  if (!audio) {
    audio = new Audio(src);
    soundCache.set(src, audio);
  }

  audio.currentTime = 0;
  void audio.play().catch(() => undefined);
}
