// Decode the browser recording and send bounded mono PCM WAV, so the server can
// verify the real duration rather than trust a client-supplied seconds field.
export async function voiceWav(blob: Blob): Promise<Blob> {
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    if (audio.duration <= 0 || audio.duration > 61) throw Error("duration");
    const count = Math.min(960000, Math.floor(audio.duration * 16000)),
      bytes = new ArrayBuffer(44 + count * 2),
      v = new DataView(bytes);
    const string = (at: number, s: string) => {
      for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
    };
    string(0, "RIFF");
    v.setUint32(4, 36 + count * 2, true);
    string(8, "WAVE");
    string(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true);
    v.setUint32(28, 32000, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    string(36, "data");
    v.setUint32(40, count * 2, true);
    const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
      audio.getChannelData(i),
    );
    for (let i = 0; i < count; i++) {
      const p = (i * audio.sampleRate) / 16000,
        lo = Math.floor(p),
        hi = Math.min(lo + 1, audio.length - 1),
        f = p - lo;
      let sample = 0;
      for (const c of channels)
        sample += (c[lo] * (1 - f) + c[hi] * f) / channels.length;
      sample = Math.max(-1, Math.min(1, sample));
      v.setInt16(
        44 + i * 2,
        sample < 0 ? sample * 32768 : sample * 32767,
        true,
      );
    }
    return new Blob([bytes], { type: "audio/wav" });
  } finally {
    await context.close();
  }
}
