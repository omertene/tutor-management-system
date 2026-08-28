/* The navbar entries for each role, in one place */
export type NavLink = { label: string; to: string };

export const teacherLinks: NavLink[] = [
    { label: "Students", to: "/teacher/register" },
    { label: "Schedule", to: "/teacher/schedule-rules" },
    { label: "Lessons", to: "/teacher/lessons" },
    { label: "Payments", to: "/teacher/payments" },
    { label: "Materials", to: "/teacher/materials" },
    { label: "Statistics", to: "/teacher/statistics" },
    { label: "Settings", to: "/teacher/settings" },
];

export const studentLinks: NavLink[] = [
    { label: "Lessons", to: "/student/lessons" },
    { label: "Payments", to: "/student/payments" },
    { label: "Materials", to: "/student/materials" },
];
