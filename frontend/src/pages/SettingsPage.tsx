import NavBar from "../components/NavBar";
import AccountSection from "../components/settings/AccountSection";
import SubjectsSection from "../components/settings/SubjectsSection";
import { teacherLinks } from "../constants/navLinks";

// teacher-only config page. subjects used to have their own standalone nav tab, but a
// dedicated page just for "add a subject name" was overkill - they live here now,
// alongside the teacher's own account settings, and can also be created inline
// straight from the lesson booking dropdown on the Lessons page.
function SettingsPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            <NavBar homePath="/teacher" links={teacherLinks} />

            <main className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>

                <AccountSection />
                <SubjectsSection />
            </main>
        </div>
    );
}

export default SettingsPage;
