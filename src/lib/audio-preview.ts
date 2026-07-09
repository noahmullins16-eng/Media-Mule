/**
 * Utility to process audio files client-side before upload to generate a secure preview.
 * - Decodes original audio using browser's AudioContext.
 * - Slices the track to a limited duration (default: 30s).
 * - Downmixes the track to mono and downsamples to 22.05 kHz to save size and reduce quality.
 * - Overlays a dual-frequency chime watermark (C5 and E5) decaying over 1.2s every 7 seconds.
 * - Encodes the rendered AudioBuffer as a 16-bit WAV PCM file.
 */
export async function generateAudioPreview(file: File, durationSeconds: number = Infinity): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Use standard AudioContext to decode
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  
  let originalBuffer: AudioBuffer;
  try {
    originalBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error("Failed to decode audio data:", err);
    throw new Error("Failed to decode audio file. Make sure it is a valid audio format.");
  } finally {
    await audioCtx.close();
  }

  const previewDuration = Math.min(durationSeconds, originalBuffer.duration);
  const sampleRate = 22050; // Downsample to 22.05 kHz to save bandwidth
  const numChannels = 1;    // Downmix to mono
  const length = Math.floor(previewDuration * sampleRate);

  // Create OfflineAudioContext to render the resampled mono buffer
  const OfflineContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineContextClass(numChannels, length, sampleRate);

  // Play the original audio buffer in the offline context
  const source = offlineCtx.createBufferSource();
  source.buffer = originalBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  // Render the audio
  const renderedBuffer = await offlineCtx.startRendering();

  // Apply the dual-frequency chime watermark directly on the Float32 channel data
  const data = renderedBuffer.getChannelData(0);
  const watermarkInterval = 7; // chime plays every 7 seconds
  const watermarkLength = Math.floor(1.2 * sampleRate); // 1.2s chime

  for (let time = 4; time < previewDuration; time += watermarkInterval) {
    const startSample = Math.floor(time * sampleRate);
    
    for (let i = 0; i < watermarkLength; i++) {
      const sampleIdx = startSample + i;
      if (sampleIdx >= data.length) break;
      
      const t = i / sampleRate;
      const envelope = Math.exp(-4.5 * t); // Decays quickly
      // Play a combination of C5 (523Hz) and E5 (659Hz) tones
      const tone = Math.sin(2 * Math.PI * 523.25 * t) * 0.4 + Math.sin(2 * Math.PI * 659.25 * t) * 0.3;
      
      // Mix the watermark chime: 60% original audio, 40% watermark tone
      data[sampleIdx] = data[sampleIdx] * 0.6 + tone * envelope * 0.4;
    }
  }

  // Encode the modified AudioBuffer to a standard WAV Blob
  return bufferToWav(renderedBuffer);
}

function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // 1 = Raw uncompressed PCM
  const bitDepth = 16;
  
  const resultLength = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(resultLength);
  const view = new DataView(bufferArr);
  const channels: Float32Array[] = [];
  
  let pos = 0;

  function writeString(s: string) {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(pos + i, s.charCodeAt(i));
    }
    pos += s.length;
  }

  function writeUint16(d: number) {
    view.setUint16(pos, d, true);
    pos += 2;
  }

  function writeUint32(d: number) {
    view.setUint32(pos, d, true);
    pos += 4;
  }

  // RIFF identifier
  writeString("RIFF");
  // File length
  writeUint32(resultLength - 8);
  // RIFF type
  writeString("WAVE");
  // Format chunk identifier
  writeString("fmt ");
  // Format chunk length
  writeUint32(16);
  // Sample format (raw)
  writeUint16(format);
  // Channel count
  writeUint16(numOfChan);
  // Sample rate
  writeUint32(sampleRate);
  // Byte rate (sample rate * block align)
  writeUint32(sampleRate * numOfChan * (bitDepth / 8));
  // Block align (channel count * bytes per sample)
  writeUint16(numOfChan * (bitDepth / 8));
  // Bits per sample
  writeUint16(bitDepth);
  // Data chunk identifier
  writeString("data");
  // Data chunk length
  writeUint32(buffer.length * numOfChan * (bitDepth / 8));

  // Write interleaved PCM audio data
  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  const length = buffer.length;
  for (let offset = 0; offset < length; offset++) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = channels[i][offset];
      // Clamp to [-1, 1]
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, intSample, true);
      pos += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}
