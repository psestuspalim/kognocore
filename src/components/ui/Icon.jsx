import React from 'react';
import {
    Book,
    Users,
    GraduationCap,
    School,
    Library,
    BookOpen,
    Briefcase,
    MonitorPlay,
    Microscope,
    Stethoscope,
    Activity,
    HeartPulse,
    Syringe,
    Pill,
    Brain
} from 'lucide-react';

const iconMap = {
    Book,
    Users,
    GraduationCap,
    School,
    Library,
    BookOpen,
    Briefcase,
    MonitorPlay,
    Microscope,
    Stethoscope,
    Activity,
    HeartPulse,
    Syringe,
    Pill,
    Brain
};

export function Icon({ name, className, style, fallback = Book }) {
    const IconComponent = iconMap[name] || fallback;

    return <IconComponent className={className} style={style} />;
}

export default Icon;
