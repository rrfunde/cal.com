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

type AvailableCellProps = {
  availableSlots: CalendarAvailableTimeslots;
  day: GridCellToDateProps["day"];
  startHour: GridCellToDateProps["startHour"];
};

export function AvailableCellsForDay({ availableSlots, day, startHour }: AvailableCellProps) {
  const { timezone } = useTimePreferences();
  const date = dayjs(day);
  const dateFormatted = date.format("YYYY-MM-DD");
  const slotsForToday = availableSlots && availableSlots[dateFormatted];

  const slots = useMemo(() => {
    const calculatedSlots: {
      slot: CalendarAvailableTimeslots[string][number];
      topOffsetMinutes: number;
      firstSlot?: CalendarAvailableTimeslots[string][number];
      timezone?: string;
    }[] = [];

    // Variables for Out of Office (OOO) handling
    let firstSlotIndex = -1;
    let lastSlotIndex = -1;
    let areAllSlotsAway = true;
    let startEndTimeDuration = 0;

    // Define the offset increment (60 minutes)
    const OFFSET_INCREMENT = 60;

    // Initialize topOffsetMinutes
    let currentOffset = 0;

    if (slotsForToday && slotsForToday.length > 0) {
      const minSlotDuration = slotsForToday.reduce((min, slot) => {
        const duration = dayjs(slot.end).diff(dayjs(slot.start), "minute");
        return Math.min(min, duration);
      }, Infinity);

      let previousSlotEnd = dayjs(slotsForToday[0].start).tz(timezone);

      slotsForToday?.forEach((slot, index) => {
        const slotStart = dayjs(slot.start).tz(timezone);
        // Assign currentOffset to the slot
        if (slotStart.isAfter(previousSlotEnd)) {
          const missingMinutes = slotStart.diff(previousSlotEnd, "minute");
          const missingSlots = Math.floor(missingMinutes / minSlotDuration);
          currentOffset += missingSlots * OFFSET_INCREMENT;
        }

        calculatedSlots.push({ slot, topOffsetMinutes: currentOffset });

        // Increment for the next slot
        currentOffset += OFFSET_INCREMENT;

        previousSlotEnd = dayjs(slot.end).tz(timezone);

        // OOO Handling
        if (!slot.away) {
          areAllSlotsAway = false;
        } else {
          if (firstSlotIndex === -1) {
            firstSlotIndex = index;
          }
          lastSlotIndex = index;
        }
      });

      // Handle Out of Office (OOO) if all slots are away
      if (areAllSlotsAway && firstSlotIndex !== -1) {
        const firstSlot = slotsForToday[firstSlotIndex];
        const lastSlot = slotsForToday[lastSlotIndex];
        // Calculate the total duration for OOO display
        startEndTimeDuration = OFFSET_INCREMENT * (lastSlotIndex - firstSlotIndex + 1);

        if (firstSlot.toUser == null) {
          return null;
        }

        return {
          slots: calculatedSlots,
          startEndTimeDuration,
          firstSlot,
          timezone,
        };
      }
    }
    return { slots: calculatedSlots, startEndTimeDuration };
  }, [slotsForToday, startHour, timezone]);

  if (slots === null) return null;

  if (slots.startEndTimeDuration) {
    const { firstSlot, startEndTimeDuration } = slots;
    return (
      <CustomCell
        timeSlot={dayjs(firstSlot?.start).tz(slots.timezone)}
        topOffsetMinutes={slots.slots[0]?.topOffsetMinutes}
        startEndTimeDuration={startEndTimeDuration}>
        <OutOfOfficeInSlots
          fromUser={firstSlot?.fromUser}
          toUser={firstSlot?.toUser}
          reason={firstSlot?.reason}
          emoji={firstSlot?.emoji}
          borderDashed={false}
          date={dateFormatted}
          className="pb-0"
        />
      </CustomCell>
    );
  }

  return (
    <>
      {slots.slots.map((slot, index) => (
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
