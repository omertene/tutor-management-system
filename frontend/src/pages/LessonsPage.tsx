import { useState } from "react";
import LogoutButton from "../components/LogoutButton";
import { decodeToken } from "../utils/jwt";
import type { Subject, Student } from "../types";

const API_BASE_URL = "http://localhost:8080";


type Lesson = {
    id: number;
    studentFirstName: string;
    studentLastName: string;
    subjectName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    subjectId: number;
    priceAtBooking: number;
    notes: string;
}


function LessonsPage() {

    const token = localStorage.getItem("token")!;
    const {role} = decodeToken(token);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [errorMessage, setErrorMessage] = useState("");

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    // form fields shared by both roles
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    // only used by the teacher's form
    const [selectedStudentId, setSelectedStudentId] = useState("");

    async function handleLoadLessons() {

        setErrorMessage("");

        const endpoint = role === "TEACHER" ? "/teacher/lessons" : "/student/lessons";

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load lessons");
            return;
        }

        const data = await response.json();

        setLessons(data);
    }


    async function handleLoadSubjects() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/subjects`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load subjects");
            return;
        }

        const data = await response.json();
        setSubjects(data);
    }

    async function handleLoadStudents() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/students`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            setErrorMessage("Failed to load students");
            return;
        }

        const data = await response.json();
        setStudents(data);
    }

    // student books a lesson for themselves - POST /student/lessons
    async function handleCreateLessonAsStudent() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/student/lessons`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                subjectId: Number(selectedSubjectId),
                date,
                startTime,
                endTime,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to create lesson");
            return;
        }

        const createdLesson = await response.json();
        setLessons([...lessons, createdLesson]);
    }

    // teacher books a lesson on behalf of a chosen student - POST /teacher/lessons
    async function handleCreateLessonForStudent() {
        setErrorMessage("");

        const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                studentId: Number(selectedStudentId),
                subjectId: Number(selectedSubjectId),
                date,
                startTime,
                endTime,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || "Failed to create lesson");
            return;
        }

        const createdLesson = await response.json();
        setLessons([...lessons, createdLesson]);
    }

    return (

        <div>
            <h1>Lessons</h1>

            <button onClick={handleLoadSubjects}>load subjects</button>
            {role === "TEACHER" && (
                <button onClick={handleLoadStudents}>load students</button>
            )}

            {role === "TEACHER" && (
                <div>
                    <h2>Book a lesson for a student</h2>

                    <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                    >
                        <option value="">select student</option>
                        {students.map((student) => (
                            <option key={student.id} value={student.id}>
                                {student.firstName} {student.lastName}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                    >
                        <option value="">select subject</option>
                        {subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                                {subject.name}
                            </option>
                        ))}
                    </select>

                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />

                    <button onClick={handleCreateLessonForStudent}>book lesson</button>
                </div>
            )}

            {role === "STUDENT" && (
                <div>
                    <h2>Book a lesson</h2>

                    <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                    >
                        <option value="">select subject</option>
                        {subjects.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                                {subject.name}
                            </option>
                        ))}
                    </select>

                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />

                    <button onClick={handleCreateLessonAsStudent}>book lesson</button>
                </div>
            )}

            <button onClick={handleLoadLessons}>show all lessons</button>

            <ul>
                {lessons.map((lesson) => (
                    <li key={lesson.id}>
                        {lesson.date} {lesson.startTime}-{lesson.endTime} —{" "}
                        {lesson.subjectName} — {lesson.studentFirstName} {lesson.studentLastName} —{" "}
                        {lesson.status}
                    </li>
                ))}
            </ul>

            {errorMessage && <p>{errorMessage}</p>}

            <br/>
            <LogoutButton/>
        </div>
    )
}

export default LessonsPage;