// The course is inherited context; the nearest parent determines where a folder appears.
export function folderBelongsToContainer(folder, type, id) {
  if (!folder?.id) return false;
  const sameId = (left, right) => left != null && right != null && String(left) === String(right);
  if (folder.parent_id) return type === "folder" && sameId(folder.parent_id, id);
  if (folder.subject_id) return type === "subject" && sameId(folder.subject_id, id);
  if (folder.course_id) return type === "course" && sameId(folder.course_id, id);
  return type === "root";
}
