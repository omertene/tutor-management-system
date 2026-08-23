// the navbar entries for each role, in one place. these were previously redeclared
// at the top of all eight page files, which is how the "Subjects" tab ended up
// pointing at a route that had been deleted - seven copies said one thing and the
// eighth said another, and nothing made them agree.
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
