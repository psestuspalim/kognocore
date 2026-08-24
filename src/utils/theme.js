// Convierte un color hex a rgb components para usar en rgba()
export const hexToRgb = (hex) => {
    // Manejar el caso de hex indefinido o no válido (fallback a un violeta)
    if (!hex || typeof hex !== 'string') hex = '#7c3aed';
    // Remover el # si existe
    const h = hex.replace('#', '');

    let r, g, b;

    if (h.length === 3) {
        r = parseInt(h.charAt(0) + h.charAt(0), 16);
        g = parseInt(h.charAt(1) + h.charAt(1), 16);
        b = parseInt(h.charAt(2) + h.charAt(2), 16);
    } else if (h.length === 6) {
        r = parseInt(h.slice(0, 2), 16);
        g = parseInt(h.slice(2, 4), 16);
        b = parseInt(h.slice(4, 6), 16);
    } else {
        // Fallback rgb
        return { r: 124, g: 58, b: 237 };
    }

    return { r, g, b };
};

// Genera la paleta pastel a partir de un color base
export const buildPalette = (hex = '#7c3aed') => {
    const c = hexToRgb(hex);
    return {
        cardBg: `rgba(${c.r},${c.g},${c.b},0.06)`,
        border: `rgba(${c.r},${c.g},${c.b},0.22)`,
        borderHover: `rgba(${c.r},${c.g},${c.b},0.45)`,
        chipBg: `rgba(${c.r},${c.g},${c.b},0.1)`,
        chipText: hex,
        chipBorder: `rgba(${c.r},${c.g},${c.b},0.22)`,
        iconBg: `rgba(${c.r},${c.g},${c.b},0.12)`,
        iconColor: hex,
        glow: `rgba(${c.r},${c.g},${c.b},0.14)`,
        shadow: `0 4px 20px rgba(${c.r},${c.g},${c.b},0.15), 0 1px 4px rgba(0,0,0,0.06)`,
        badgeBg: `rgba(${c.r},${c.g},${c.b},0.1)`,
        badgeText: hex,
        badgeBorder: `rgba(${c.r},${c.g},${c.b},0.2)`,
        accentLine: `linear-gradient(90deg, ${hex}, rgba(${c.r},${c.g},${c.b},0.3))`,
        // Extras para flexiblidad en otros componentes
        textDim: `rgba(${c.r},${c.g},${c.b},0.8)`,
        solidHover: `rgba(${c.r},${c.g},${c.b},0.9)`,
    };
};
