import { NavLink } from "react-router-dom";
import LogoutButton from "./LogoutButton";

type NavBarProps = {
    homePath: string;
    links: { label: string; to: string }[];
};

/* Shared top nav for every page after login. homePath/links are passed in per
   role (teacher vs student) since each role sees different pages */
function NavBar({ homePath, links }: NavBarProps) {
    return (
        <header className="bg-white border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
                <NavLink to={homePath} className="text-lg font-semibold text-slate-900">
                    TutorHub
                </NavLink>

                <nav className="flex items-center gap-1">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) =>
                                `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    isActive
                                        ? "bg-indigo-50 text-indigo-700"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <LogoutButton />
            </div>
        </header>
    );
}

export default NavBar;
