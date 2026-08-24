// Paleta de colores para carpetas
// Colores vibrantes y distinguibles para asignar a carpetas automáticamente

export const FOLDER_COLORS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#84cc16', // Lime
    '#10b981', // Emerald
    '#14b8a6', // Teal
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#a855f7', // Purple
    '#ec4899', // Pink
];

/**
 * Obtiene un color para una carpeta basado en su índice
 * @param {number} index - Índice de la carpeta
 * @returns {string} Color hexadecimal
 */
export function getFolderColor(index) {
    return FOLDER_COLORS[index % FOLDER_COLORS.length];
}

/**
 * Asigna colores a un array de carpetas si no tienen color
 * @param {Array} folders - Array de carpetas
 * @returns {Array} Carpetas con colores asignados
 */
export function assignFolderColors(folders) {
    return folders.map((folder, index) => ({
        ...folder,
        color: folder.color || getFolderColor(index)
    }));
}
