import NavBar from "../components/NavBar";
import AccountSection from "../components/settings/AccountSection";
import SubjectsSection from "../components/settings/SubjectsSection";
import { teacherLinks } from "../constants/navLinks";

/* Teacher-only config page: the teacher's own account settings plus subject
   management. Subjects can also be created inline from the booking dropdown
   on the Lessons page. */
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
