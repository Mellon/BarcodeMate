import { test } from "node:test";
import assert from "node:assert/strict";
import messages from "../src/home/pair-messages.json";
import home from "../src/home/messages.json";
test("pairing instructions cover all 24 application languages without empty or missing messages", () => {
  assert.deepEqual(Object.keys(messages).sort(), Object.keys(home).sort());
  for (const values of Object.values(messages)) {
    assert.deepEqual(
      Object.keys(values).sort(),
      Object.keys(messages.en).sort(),
    );
    for (const value of Object.values(values)) assert(value.trim().length > 0);
  }
});
