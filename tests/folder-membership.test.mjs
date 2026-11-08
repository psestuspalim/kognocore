import test from "node:test";
import assert from "node:assert/strict";
import { folderBelongsToContainer } from "../src/lib/folder-membership.js";

const folders = [
  { id: "directa", course_id: "asesorias" },
  { id: "diagnosticos", course_id: "asesorias", subject_id: "anatomia" },
  { id: "respiratorio", course_id: "asesorias", subject_id: "anatomia", parent_id: "diagnosticos" },
  { id: "profunda", course_id: "asesorias", subject_id: "anatomia", parent_id: "respiratorio" },
  { id: "sin-curso", parent_id: "diagnosticos" },
  { id: "otra", course_id: "otro-curso" },
  { id: "raiz" },
];
const children = (type, id) => folders.filter(f => folderBelongsToContainer(f, type, id)).map(f => f.id);

test("course displays only direct folders, excluding subjects and deeper descendants", () => {
  assert.deepEqual(children("course", "asesorias"), ["directa"]);
  assert.deepEqual(children("subject", "anatomia"), ["diagnosticos"]);
});
test("each folder displays only its immediate children, even without inherited course metadata", () => {
  assert.deepEqual(children("folder", "diagnosticos"), ["respiratorio", "sin-curso"]);
  assert.deepEqual(children("folder", "respiratorio"), ["profunda"]);
  assert.deepEqual(children("folder", "profunda"), []);
});
test("root and ID normalization do not leak unrelated or invalid folders", () => {
  assert.deepEqual(children("root"), ["raiz"]);
  assert.deepEqual(children("course"), []);
  assert.equal(folderBelongsToContainer({id: "f", course_id: 12}, "course", "12"), true);
  assert.equal(folderBelongsToContainer(null, "root"), false);
  assert.equal(folderBelongsToContainer({}, "root"), false);
});
