function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export const CHAPTER_AUDIO_PROFILES = deepFreeze([
  {
    waveform: "sine",
    duration: 4.6,
    cadence: 0.82,
    gain: 0.0048,
    chords: [[146.83, 220, 293.66], [164.81, 246.94, 329.63]],
    arrival: [293.66, 329.63, 440]
  },
  {
    waveform: "triangle",
    duration: 4.42,
    cadence: 0.82,
    gain: 0.0042,
    chords: [[130.81, 196, 261.63], [146.83, 220, 293.66]],
    arrival: [196, 220, 293.66]
  },
  {
    waveform: "sine",
    duration: 4.24,
    cadence: 0.8,
    gain: 0.0052,
    chords: [[123.47, 185, 246.94], [138.59, 207.65, 277.18]],
    arrival: [246.94, 277.18, 369.99]
  },
  {
    waveform: "triangle",
    duration: 4.06,
    cadence: 0.78,
    gain: 0.0045,
    chords: [[146.83, 220, 329.63], [164.81, 246.94, 369.99]],
    arrival: [329.63, 369.99, 493.88]
  }
]);

export function ambientChapterCueData(chapterIndex, step, flowScore = 0) {
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= CHAPTER_AUDIO_PROFILES.length) return null;
  const profile = CHAPTER_AUDIO_PROFILES[chapterIndex];
  const safeStep = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0;
  const chord = profile.chords[safeStep % profile.chords.length];
  const lift = Number.isFinite(flowScore) && flowScore > 120 ? 1.5 : 1;
  return {
    duration: profile.duration,
    nextAfter: profile.duration * profile.cadence,
    voices: chord.map((frequency, index) => ({
      type: profile.waveform,
      frequency: frequency * lift,
      offset: index * 0.045,
      gain: profile.gain
    }))
  };
}

export function chapterEntryCueData(chapterIndex, fromChapter = -1) {
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= CHAPTER_AUDIO_PROFILES.length) return null;
  const profile = CHAPTER_AUDIO_PROFILES[chapterIndex];
  const voices = [];
  const hasSource = Number.isInteger(fromChapter)
    && fromChapter >= 0
    && fromChapter < CHAPTER_AUDIO_PROFILES.length
    && fromChapter !== chapterIndex;
  if (hasSource) {
    const source = CHAPTER_AUDIO_PROFILES[fromChapter];
    const sourceRoot = source.chords.at(-1)[0];
    voices.push({
      type: source.waveform,
      from: sourceRoot,
      to: sourceRoot * 0.75,
      offset: 0,
      gain: 0.014,
      time: 0.28
    });
  }
  profile.arrival.forEach((frequency, index) => {
    voices.push({
      type: profile.waveform,
      from: frequency * 0.84,
      to: frequency,
      offset: (hasSource ? 0.24 : 0) + index * 0.11,
      gain: 0.014 + index * 0.002,
      time: 0.3 + index * 0.04
    });
  });
  return { voices };
}

export function summitCueData() {
  return {
    voices: [
      { type: "sine", from: 246.94, to: 329.63, offset: 0, gain: 0.018, time: 0.42 },
      { type: "triangle", from: 329.63, to: 493.88, offset: 0.13, gain: 0.017, time: 0.5 },
      { type: "sine", from: 440, to: 659.25, offset: 0.28, gain: 0.015, time: 0.58 },
      { type: "sine", from: 659.25, to: 987.77, offset: 0.48, gain: 0.011, time: 0.72 }
    ]
  };
}
