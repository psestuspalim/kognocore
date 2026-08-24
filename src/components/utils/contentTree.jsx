// components/utils/contentTree.js

// Tipos lógicos de contenedor
export const CONTAINER_TYPES = {
  COURSE: "course",
  FOLDER: "folder",
  SUBJECT: "subject",
};

/**
 * Normaliza Course, Folder y Subject en una sola lista de "containers"
 *
 * @param {Object[]} courses
 * @param {Object[]} folders
 * @param {Object[]} subjects
 * @returns {Object[]} containers
 */
export function buildContainers(courses = [], folders = [], subjects = []) {
  const containers = [];

  // Courses → contenedores raíz
  for (const c of courses) {
    containers.push({
      ...c,
      container_id: c.id,
      type: CONTAINER_TYPES.COURSE,
      parent_id: null, // siempre raíz
    });
  }

  // Folders → pueden colgar de course, folder o subject
  for (const f of folders) {
    let parent_id = null;

    if (f.parent_id) {
      // subcarpeta
      parent_id = f.parent_id;
    } else if (f.subject_id) {
      // carpeta dentro de materia
      parent_id = f.subject_id;
    } else if (f.course_id) {
      // carpeta directa de un curso
      parent_id = f.course_id;
    }

    containers.push({
      ...f,
      container_id: f.id,
      type: CONTAINER_TYPES.FOLDER,
      parent_id,
    });
  }

  // Subjects → pueden colgar de course o de folder
  for (const s of subjects) {
    let parent_id = null;

    if (s.folder_id) {
      parent_id = s.folder_id;
    } else if (s.course_id) {
      parent_id = s.course_id;
    }

    containers.push({
      ...s,
      container_id: s.id,
      type: CONTAINER_TYPES.SUBJECT,
      parent_id,
    });
  }

  return containers;
}

/**
 * Devuelve contenedores raíz (los que no tienen parent_id)
 */
export function getRootContainers(containers = []) {
  return containers.filter((c) => !c.parent_id);
}

/**
 * Devuelve los hijos directos de un contenedor
 */
export function getChildrenContainers(containers = [], parentId) {
  return containers.filter((c) => c.parent_id === parentId);
}

/**
 * Reglas claras de qué se puede meter dentro de qué
 * - course  → no se puede meter en nada (solo raíz)
 * - folder  → dentro de course o folder
 * - subject → dentro de course o folder
 * - quiz    → dentro de subject (esto lo usa Quizzes/FileExplorer)
 */
export function canMoveItemToTarget(itemType, targetType) {
  const rules = {
    course: [], // no se mueve dentro de otro contenedor
    folder: ["course", "folder", "subject"],
    subject: ["course", "folder"],
    quiz: ["subject", "folder"],
  };

  if (!targetType) {
    // mover a raíz: solo folders/subjects huérfanos, si lo permites
    return itemType === "folder" || itemType === "subject";
  }

  return rules[itemType]?.includes(targetType) ?? false;
}