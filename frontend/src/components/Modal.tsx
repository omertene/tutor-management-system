import type { ReactNode } from "react";

type ModalProps = {
    title: string;
    onClose: () => void;
    children: ReactNode;
};


function Modal({ title, onClose, children }: ModalProps) {
    return (
        <div
            className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default Modal;
