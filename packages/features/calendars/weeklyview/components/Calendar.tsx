import React, { useEffect, useMemo, useRef } from "react";

import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { classNames } from "@calcom/lib";

import { useCalendarStore } from "../state/store";
import "../styles/styles.css";
import type { CalendarComponentProps } from "../types/state";
import { getDaysBetweenDates, getHoursToDisplay } from "../utils";
import { DateValues } from "./DateValues";
import { AvailableCellsForDay, EmptyCell, UnavailableCellsForDay } from "./event/Empty";
import { EventList } from "./event/EventList";
import { SchedulerColumns } from "./grid";
import { HorizontalLines } from "./horizontalLines";
import { VerticalLines } from "./verticalLines";

export function Calendar(props: CalendarComponentProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const containerNav = useRef<HTMLDivElement | null>(null);
  const containerOffset = useRef<HTMLDivElement | null>(null);
  const schedulerGrid = useRef<HTMLOListElement | null>(null);
  const initialState = useCalendarStore((state) => state.initState);
  const { timezone } = useTimePreferences();

  const startDate = useCalendarStore((state) => state.startDate);
  const endDate = useCalendarStore((state) => state.endDate);
  const startHour = useCalendarStore((state) => state.startHour || 9);
  const endHour = useCalendarStore((state) => state.endHour || 21);
  const usersCellsStopsPerHour = useCalendarStore((state) => state.gridCellsPerHour || 4);
  const hoverEventDuration = useCalendarStore((state) => state.hoverEventDuration || 4);
  const availableTimeslots = useCalendarStore((state) => state.availableTimeslots);
  const hideHeader = useCalendarStore((state) => state.hideHeader);

  const days = useMemo(() => getDaysBetweenDates(startDate, endDate), [startDate, endDate]);

  const hours = useMemo(
    () => getHoursToDisplay(startHour || 9, endHour || 21, timezone),
    [startHour, endHour, timezone]
  );
  const numberOfGridStopsPerDay = hours.length * usersCellsStopsPerHour;
  const hourSize = 28;

  // Initialize state on mount
  useEffect(() => {
    initialState(props);
  }, [props, initialState]);

  return (
    <div
      className={classNames("scheduler-wrapper flex h-full w-full flex-col sm:flex-row", "overflow-auto")}
      style={
        {
          "--one-minute-height": `calc(${hourSize}px/60)`,
          "--gridDefaultSize": `${hourSize}px`,
        } as React.CSSProperties
      }>
      <div ref={container} className="bg-default dark:bg-muted relative isolate flex flex-auto flex-col">
        <div
          style={{ width: "100%", minWidth: "400px" }}
          className="flex h-full max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
          <DateValues containerNavRef={containerNav} days={days} />
          <div className="relative flex flex-auto overflow-x-auto">
            <div className="bg-default dark:bg-muted ring-muted border-default sticky left-0 z-10 w-14 flex-none border-l border-r ring-1" />
            <div
              className="grid flex-auto grid-cols-1 grid-rows-1 [--disabled-gradient-background:#F8F9FB] [--disabled-gradient-foreground:#E6E7EB] dark:[--disabled-gradient-background:#262626] dark:[--disabled-gradient-foreground:#393939]"
              style={{ backgroundColor: "gray" }}>
              <HorizontalLines
                startHour={startHour}
                endHour={endHour}
                numberOfGridStopsPerCell={usersCellsStopsPerHour}
                containerOffsetRef={containerOffset}
              />
              <VerticalLines days={days} />

              <SchedulerColumns
                offsetHeight={containerOffset.current?.offsetHeight}
                gridStopsPerDay={numberOfGridStopsPerDay}>
                {days.map((day, i) => (
                  <li key={day.toISOString()} className="relative" style={{ gridColumnStart: i + 1 }}>
                    <EventList day={day} />
                  </li>
                ))}
              </SchedulerColumns>

              <SchedulerColumns
                ref={schedulerGrid}
                offsetHeight={containerOffset.current?.offsetHeight}
                gridStopsPerDay={numberOfGridStopsPerDay}>
                {days.map((day, i) => (
                  <li
                    className="relative"
                    key={i}
                    style={{
                      gridRow: `1 / span ${numberOfGridStopsPerDay}`,
                    }}>
                    {availableTimeslots ? (
                      <>
                        <AvailableCellsForDay
                          key={day.toISOString()}
                          day={day}
                          startHour={startHour}
                          slotDuration={hoverEventDuration}
                          availableSlots={availableTimeslots}
                        />
                        <UnavailableCellsForDay
                          key={`unavailable-${day.toISOString()}`}
                          day={day}
                          startHour={startHour}
                          endHour={endHour}
                          availableSlots={availableTimeslots}
                          timezone={timezone}
                          slotDuration={hoverEventDuration}
                        />
                      </>
                    ) : (
                      [...Array(numberOfGridStopsPerDay)].map((_, j) => {
                        const key = `${i}-${j}`;
                        return (
                          <EmptyCell
                            key={key}
                            day={day}
                            gridCellIdx={j}
                            totalGridCells={numberOfGridStopsPerDay}
                            selectionLength={endHour - startHour}
                            startHour={startHour}
                            timezone={timezone}
                          />
                        );
                      })
                    )}
                  </li>
                ))}
              </SchedulerColumns>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
