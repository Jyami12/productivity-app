import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { demoStore, elapsedSeconds } from "../src/data/demoStore.ts";
const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => memory.set(k, v),
};
beforeEach(() => memory.clear());
const active = {
  startedAt: 1000,
  mode: "countdown",
  duration: 1,
  tag: "Deep work",
};
test("elapsed time survives reload and never becomes negative", () => {
  demoStore.setActive(active);
  assert.equal(elapsedSeconds(demoStore.getActive(), 31000), 30);
  assert.equal(elapsedSeconds(active, 0), 0);
});
test("early completion is rejected and repeated completion is not duplicated", () => {
  assert.equal(demoStore.complete(active, 60000).length, 0);
  assert.equal(demoStore.complete(active, 61000)[0].seconds, 60);
  assert.equal(demoStore.complete(active, 121000).length, 1);
});
test("stopwatch saves elapsed time only after one minute", () => {
  const watch = { ...active, mode: "stopwatch" };
  assert.equal(demoStore.complete(watch, 30000).length, 0);
  assert.equal(demoStore.complete(watch, 91000)[0].seconds, 90);
});
test("cancellation clears active session without saving a reward", () => {
  demoStore.setActive(active);
  demoStore.setActive(null);
  assert.equal(demoStore.getActive(), null);
  assert.deepEqual(demoStore.getSessions(), []);
});
test("corrupt storage falls back to an empty workspace", () => {
  memory.set("dinofocus.demo.sessions.v1", "{broken");
  memory.set("dinofocus.demo.active.v1", "{}");
  assert.deepEqual(demoStore.getSessions(), []);
  assert.equal(demoStore.getActive(), null);
});
