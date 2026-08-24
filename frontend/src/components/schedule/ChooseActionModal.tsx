import Modal from "../Modal";

type ChooseActionModalProps = {
    date: string;
    startTime: string;
    endTime: string;
    // picks which pair of options is shown: book + block for available time,
    // book + add for unavailable time. mirrors what the backend will accept for
    // this range, so the popup never offers an action the server would reject
    isUnavailable: boolean;
    onClose: () => void;
    onBookLesson: () => void;
    onBlockTime: () => void;
    onAddAvailability: () => void;
};

// shown after clicking or drag-selecting a range - lets the teacher choose to book
// a lesson there, or change availability instead
export default function ChooseActionModal({
    date, startTime, endTime, isUnavailable,
    onClose, onBookLesson, onBlockTime, onAddAvailability,
}: ChooseActionModalProps) {
    return (
        <Modal title={isUnavailable ? "Unavailable time" : "Available time"} onClose={onClose}>
            <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-500">
                    {date} &middot; {startTime}&ndash;{endTime}
                </p>
                <button
                    onClick={onBookLesson}
                    className="w-full rounded-lg bg-indigo-600 text-white text-sm font-medium py-2.5 hover:bg-indigo-700 transition-colors"
                >
                    Book a lesson here
                </button>
                {isUnavailable ? (
                    <button
                        onClick={onAddAvailability}
                        className="w-full rounded-lg bg-white border border-green-200 text-green-700 text-sm font-medium py-2.5 hover:bg-green-50 transition-colors"
                    >
                        Add availability
                    </button>
                ) : (
                    <button
                        onClick={onBlockTime}
                        className="w-full rounded-lg bg-white border border-red-200 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                    >
                        Block this time
                    </button>
                )}
            </div>
        </Modal>
    );
}
