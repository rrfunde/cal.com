import { useMemo } from "react";
import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { classNames } from "@calcom/lib";

import { OutOfOfficeInSlots } from "../../../../bookings/Booker/components/OutOfOfficeInSlots";
import { useCalendarStore } from "../../state/store";
import type { CalendarAvailableTimeslots } from "../../types/state";
import type { GridCellToDateProps } from "../../utils";

type EmptyCellProps = GridCellToDateProps & {
  isDisabled?: boolean;
  topOffsetMinutes?: number;
};

export function EmptyCell(props: EmptyCellProps) {
  // Modify as needed based on slot-based offset
  const { slotIndex } = props; // Ensure slotIndex is passed
  const topOffsetMinutes = slotIndex * 60;

  return <Cell topOffsetMinutes={topOffsetMinutes} timeSlot={dayjs(props.day).tz(props.timezone)} />;
}

interface AvailableCellProps {
  availableSlots: CalendarAvailableTimeslots;
  day: string;
  startHour: number;
  slotDuration: number; // Duration of each slot in minutes
}

export function AvailableCellsForDay({ availableSlots, day, startHour, slotDuration }: AvailableCellProps) {
  const { timezone } = useTimePreferences();
  const date = dayjs(day).tz(timezone);
  const dateFormatted = date.format("YYYY-MM-DD");
  const slotsForToday = availableSlots && availableSlots[dateFormatted];

  const slots = useMemo(() => {
    if (!slotsForToday || slotsForToday.length === 0) return null;

    const OFFSET_INCREMENT = 60; // Always 60 minutes for display purposes

    const dayStart = date.hour(startHour).minute(0).second(0);
    const firstSlotStart = dayjs(slotsForToday[0].start).tz(timezone);

    // Calculate initial missing slots
    const initialMissingMinutes = firstSlotStart.diff(dayStart, "minute");
    const initialMissingSlots = Math.floor(initialMissingMinutes / slotDuration);
    let currentOffset = initialMissingSlots * OFFSET_INCREMENT;

    let previousSlotEnd = firstSlotStart;

    return slotsForToday.map((slot) => {
      const slotStart = dayjs(slot.start).tz(timezone);

      if (slotStart.isAfter(previousSlotEnd)) {
        const missingMinutes = slotStart.diff(previousSlotEnd, "minute");
        const missingSlots = Math.floor(missingMinutes / slotDuration);
        currentOffset += missingSlots * OFFSET_INCREMENT;
      }

      const calculatedSlot = {
        slot,
        topOffsetMinutes: currentOffset,
      };

      currentOffset += OFFSET_INCREMENT;
      previousSlotEnd = dayjs(slot.end).tz(timezone);

      return calculatedSlot;
    });
  }, [slotsForToday, startHour, timezone, date, slotDuration]);

  if (!slots) return null;

  return (
    <>
      {slots.map((slot, index) => (
        <Cell
          key={index}
          timeSlot={dayjs(slot.slot.start).tz(timezone)}
          topOffsetMinutes={slot.topOffsetMinutes}
        />
      ))}
    </>
  );
}

type CellProps = {
  isDisabled?: boolean;
  topOffsetMinutes?: number;
  timeSlot: Dayjs;
};

export function Cell({ isDisabled, topOffsetMinutes, timeSlot }: CellProps) {
  const { timeFormat } = useTimePreferences();

  const { onEmptyCellClick } = useCalendarStore(
    (state) => ({
      onEmptyCellClick: state.onEmptyCellClick,
    }),
    shallow
  );

  return (
    <div
      className={classNames(
        "group flex w-full items-center justify-center bg-white",
        isDisabled && "pointer-events-none",
        topOffsetMinutes !== undefined && "absolute left-0 right-0"
      )}
      data-disabled={isDisabled}
      data-slot={timeSlot.toISOString()}
      data-testid="calendar-empty-cell"
      style={{
        height: `calc(60 * var(--one-minute-height))`, // Fixed height for 60 minutes
        overflow: "visible",
        top:
          topOffsetMinutes !== undefined ? `calc(${topOffsetMinutes} * var(--one-minute-height))` : undefined,
      }}
      onClick={() => {
        if (!isDisabled && onEmptyCellClick) {
          onEmptyCellClick(timeSlot.toDate());
        }
      }}>
      {/* Centered "O" */}
      {!isDisabled && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-500"
          style={{
            height: `calc(60 * var(--one-minute-height) - 2px)`,
            width: "calc(100% - 2px)",
          }}>
          O
        </div>
      )}
      {/* Out of Office Indicator */}
      {isDisabled && (
        <OutOfOfficeInSlots
          fromUser={isDisabled.fromUser}
          toUser={isDisabled.toUser}
          reason={isDisabled.reason}
          emoji={isDisabled.emoji}
          borderDashed={false}
          date={timeSlot.format("YYYY-MM-DD")}
          className="h-full w-full"
        />
      )}
    </div>
  );
}

function CustomCell({
  timeSlot,
  children,
  topOffsetMinutes,
  startEndTimeDuration,
}: CellProps & { children: React.ReactNode; startEndTimeDuration?: number }) {
  return (
    <div
      className={classNames(
        "bg-default dark:bg-muted group absolute z-[65] flex w-[calc(100%-1px)] items-center justify-center"
      )}
      data-slot={timeSlot.toISOString()}
      style={{
        top: topOffsetMinutes ? `calc(${topOffsetMinutes}*var(--one-minute-height))` : undefined,
        overflow: "visible",
      }}>
      <div
        className={classNames(
          "dark:border-emphasis bg-default dark:bg-muted cursor-pointer rounded-[4px] p-[6px] text-xs font-semibold dark:text-white"
        )}
        style={{
          height: `calc(${startEndTimeDuration}*var(--one-minute-height) - 2px)`,
          width: "calc(100% - 2px)",
        }}>
        {children}
      </div>
    </div>
  );
}
