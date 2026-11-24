#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  CHAPTER_AUDIO_PROFILES,
  LUMEN_PICKUP_SOUNDS,
  ambientChapterCueData,
  chapterEntryCueData,
  summitCueData
} from "../public/modules/game/audio-cues.mjs";

assert.equal(CHAPTER_AUDIO_PROFILES.length, 4);
assert.equal(new Set(CHAPTER_AUDIO_PROFILES.map((profile) => profile.duration)).size, 4);
assert.equal(new Set(CHAPTER_AUDIO_PROFILES.map((profile) => profile.waveform)).size, 2);
assert.ok(Object.isFrozen(CHAPTER_AUDIO_PROFILES));
for (const profile of CHAPTER_AUDIO_PROFILES) {
  assert.ok(Object.isFrozen(profile));
  assert.ok(Object.isFrozen(profile.chords));
  assert.equal(profile.chords.length, 2);
  assert.equal(profile.arrival.length, 3);
}

assert.equal(LUMEN_PICKUP_SOUNDS.length, CHAPTER_AUDIO_PROFILES.length);
for (const [chapter, voices] of LUMEN_PICKUP_SOUNDS.entries()) {
  assert.equal(voices.length, 2);
  const [first, answer] = voices;
  assert.equal(first.delay, 0);
  assert.equal(first.to, CHAPTER_AUDIO_PROFILES[chapter].arrival.at(-1) * 2);
  assert.equal(answer.to, first.to * 0.75, "all acts use the same descending fourth");
  assert.ok(first.time + 0.025 <= answer.delay, "the first oscillator stops before the answer starts");
  assert.ok(answer.delay + answer.time <= 0.2);
  for (const voice of voices) {
    assert.equal(voice.from, voice.to, "the collectible has two struck pitches, distinct from a refill glide");
    assert.equal(voice.type, CHAPTER_AUDIO_PROFILES[chapter].waveform);
    assert.ok(voice.gain > 0 && voice.gain <= 0.034, "neither strike exceeds the refill's peak");
    assert.ok(Object.isFrozen(voice));
  }
}

const gateFirst = ambientChapterCueData(0, 0, 0);
const gateThird = ambientChapterCueData(0, 2, 0);
assert.deepEqual(gateThird, gateFirst);
assert.equal(gateFirst.voices.length, 3);
assert.equal(gateFirst.voices[0].type, "sine");
assert.equal(ambientChapterCueData(0, 0, 121).voices[0].frequency, gateFirst.voices[0].frequency * 1.5);
assert.equal(ambientChapterCueData(-1, 0), null);
assert.equal(ambientChapterCueData(4, 0), null);

const directEntry = chapterEntryCueData(2);
const actTransition = chapterEntryCueData(2, 1);
assert.equal(directEntry.voices.length, 3);
assert.equal(actTransition.voices.length, 4);
assert.equal(actTransition.voices[0].offset, 0);
assert.ok(actTransition.voices[1].offset > actTransition.voices[0].offset);
assert.equal(chapterEntryCueData(2, 2).voices.length, 3);
assert.equal(chapterEntryCueData(99, 1), null);

for (const cue of [gateFirst, directEntry, actTransition, summitCueData()]) {
  assert.ok(cue.voices.length > 0);
  for (const voice of cue.voices) {
    assert.ok(["sine", "triangle"].includes(voice.type));
    assert.ok((voice.frequency || voice.to) > 0);
    assert.ok(voice.offset >= 0 && voice.offset < 1);
    assert.ok(voice.gain > 0 && voice.gain <= 0.02);
  }
}
assert.equal(summitCueData().voices.length, 4);

console.log("Audio cue checks passed: four chapter identities, collectible strikes, two-part transitions and summit cadence.");
