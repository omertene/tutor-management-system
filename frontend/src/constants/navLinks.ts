/* The navbar entries for each role, in one place */
export type NavLink = { label: string; to: string };

export const teacherLinks: NavLink[] = [
    { label: "תלמידים", to: "/teacher/register" },
    { label: "לוח זמנים", to: "/teacher/schedule-rules" },
    { label: "שיעורים", to: "/teacher/lessons" },
    { label: "תשלומים", to: "/teacher/payments" },
    { label: "חומרי לימוד", to: "/teacher/materials" },
    { label: "סטטיסטיקה", to: "/teacher/statistics" },
    { label: "הגדרות", to: "/teacher/settings" },
];

export const studentLinks: NavLink[] = [
    { label: "בית", to: "/student" },
    { label: "שיעורים", to: "/student/lessons" },
    { label: "חומרי לימוד", to: "/student/materials" },
    { label: "תשלומים", to: "/student/payments" },
];
