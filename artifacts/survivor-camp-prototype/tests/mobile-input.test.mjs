import test from "node:test";
import assert from "node:assert/strict";
import { input, sprint, clearInput } from "../src/game/state.ts";

test("sprint observers read the gameplay latch synchronously, including resets", () => {
  clearInput();
  const observed = [];
  const unsubscribe = sprint.subscribe(() =>
    observed.push(sprint.getSnapshot()),
  );
  sprint.toggle();
  assert.equal(input.run, true);
  input.run = true; // No duplicate notification for an unchanged latch.
  input.joyX = 0.7;
  input.joyY = 0.7;
  input.looking = true;
  input.joyX = input.joyY = 0;
  input.looking = false;
  assert.equal(sprint.getSnapshot(), true);
  sprint.toggle();
  sprint.toggle();
  clearInput();
  assert.deepEqual(observed, [true, false, true, false]);
  unsubscribe();
  sprint.toggle();
  assert.equal(observed.length, 4);
  clearInput();
});

test("every explicit reset clears sprint and invalidates interrupted gestures", () => {
  const epoch = input.epoch;
  input.run = true;
  input.joyY = 1;
  input.looking = true;
  clearInput();
  assert.equal(sprint.getSnapshot(), false);
  assert.equal(input.joyY, 0);
  assert.equal(input.looking, false);
  assert.equal(input.epoch, epoch + 1);
  clearInput();
  assert.equal(input.epoch, epoch + 2);
});
