import { NavLink } from "react-router-dom";
import LogoutButton from "./LogoutButton";
import { CONTACT_PHONE, whatsappDigits } from "../utils/contact";

type NavBarProps = {
    homePath: string;
    links: { label: string; to: string }[];
};

/* Shared top nav for every page after login. homePath/links are passed in per
   role (teacher vs student) since each role sees different pages */
function NavBar({ homePath, links }: NavBarProps) {
    /* Students get a "help" link that opens WhatsApp with the teacher (only if a phone is configured) */
    const showHelp = homePath === "/student" && CONTACT_PHONE;

    return (
        <header className="bg-white border-b border-slate-200">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16 gap-4">
                <NavLink to={homePath} dir="ltr" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#1e2a66]">
                    <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#fbbf24]" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18214f" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z" />
                            <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z" />
                        </svg>
                    </span>
                    omerlessons
                </NavLink>

                <nav className="flex flex-1 items-center gap-1">
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.to === homePath}
                            className={({ isActive }) =>
                                `flex h-16 items-center border-b-[3px] px-3.5 text-[15px] font-semibold transition-colors ${
                                    isActive
                                        ? "border-[#fbbf24] text-[#1e2a66]"
                                        : "border-transparent text-slate-600 hover:text-[#1e2a66]"
                                }`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex items-center gap-1">
                    {showHelp && (
                        <a
                            href={`https://wa.me/${whatsappDigits(CONTACT_PHONE!)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                            עזרה
                        </a>
                    )}
                    <LogoutButton />
                </div>
            </div>
        </header>
    );
}

export default NavBar;
