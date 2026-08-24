import { useEffect, useState } from "react";

type DragSelectOptions = {
    // true when this cell already has an override or lesson on it - dragging can
    // neither start on nor extend through one
    isCellBlocked: (dayIndex: number, hour: number) => boolean;
    // narrows the raw [start, current] drag to the widest run that's uniformly
    // available, so a drag across mixed cells doesn't select time the teacher
    // didn't intend
    clampRange: (dayIndex: number, startHour: number, hour: number) => [number, number];
    // called once on mouse-up with the resolved half-open range
    onRangeSelected: (dayIndex: number, startHour: number, endHour: number) => void;
};

// drag-to-select a multi-hour range across cells in the same day column.
//
// the mouseup listener lives on window rather than the cells, so releasing the
// button outside the grid still completes (or abandons) the drag instead of
// leaving the page stuck in a dragging state.
export function useDragSelect({ isCellBlocked, clampRange, onRangeSelected }: DragSelectOptions) {
    const [dragDayIndex, setDragDayIndex] = useState<number | null>(null);
    const [dragStartHour, setDragStartHour] = useState<number | null>(null);
    const [dragCurrentHour, setDragCurrentHour] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        function handleMouseUp() {
            if (!isDragging || dragDayIndex === null || dragStartHour === null || dragCurrentHour === null) {
                setIsDragging(false);
                return;
            }

            const [rangeStart, rangeEnd] = clampRange(dragDayIndex, dragStartHour, dragCurrentHour);
            onRangeSelected(dragDayIndex, rangeStart, rangeEnd);

            setIsDragging(false);
            setDragDayIndex(null);
            setDragStartHour(null);
            setDragCurrentHour(null);
        }

        window.addEventListener("mouseup", handleMouseUp);
        return () => window.removeEventListener("mouseup", handleMouseUp);
    }, [isDragging, dragDayIndex, dragStartHour, dragCurrentHour, clampRange, onRangeSelected]);

    function handleCellMouseDown(dayIndex: number, hour: number) {
        if (isCellBlocked(dayIndex, hour)) return;
        setDragDayIndex(dayIndex);
        setDragStartHour(hour);
        setDragCurrentHour(hour);
        setIsDragging(true);
    }

    function handleCellMouseEnter(dayIndex: number, hour: number) {
        if (!isDragging || dragDayIndex !== dayIndex || dragStartHour === null) return;
        setDragCurrentHour(hour);
    }

    function isCellInDragSelection(dayIndex: number, hour: number): boolean {
        if (!isDragging || dragDayIndex !== dayIndex || dragStartHour === null || dragCurrentHour === null) return false;
        const lo = Math.min(dragStartHour, dragCurrentHour);
        const hi = Math.max(dragStartHour, dragCurrentHour);
        return hour >= lo && hour <= hi;
    }

    return { handleCellMouseDown, handleCellMouseEnter, isCellInDragSelection };
}
