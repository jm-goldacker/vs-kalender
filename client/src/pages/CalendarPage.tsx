import { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import deLocale from '@fullcalendar/core/locales/de';
import type { DateSelectArg, DatesSetArg, EventClickArg } from '@fullcalendar/core';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Booking, Bus } from '../api/types';
import { BookingDialog, type DialogState } from '../components/BookingDialog';
import { BookingDetails } from '../components/BookingDetails';
import wortmarke from '../assets/vs-wortmarke.png';

const PLUGINS = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin];
const TOOLBAR_MOBILE = { left: 'prev,next', center: 'title', right: 'listWeek,dayGridMonth' };
const TOOLBAR_DESKTOP = {
  left: 'prev,next today',
  center: 'title',
  right: 'dayGridMonth,timeGridWeek,listWeek',
};
const BUTTON_TEXT = { list: 'Liste' };

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

export function CalendarPage() {
  const isMobile = useIsMobile();
  const calendarRef = useRef<FullCalendar>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [hiddenBuses, setHiddenBuses] = useState<Set<number>>(new Set());
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [details, setDetails] = useState<Booking | null>(null);

  const { data: buses = [] } = useQuery({
    queryKey: ['buses'],
    queryFn: () => api.get<Bus[]>('/buses'),
  });

  const { data: bookings = [], refetch } = useQuery({
    queryKey: ['bookings', range?.from, range?.to],
    queryFn: () => api.get<Booking[]>(`/bookings?from=${range!.from}&to=${range!.to}`),
    enabled: range !== null,
  });

  // Auf kleinen Displays ist das Monatsraster unbedienbar → Listenansicht
  useEffect(() => {
    const calApi = calendarRef.current?.getApi();
    if (!calApi) return;
    if (isMobile && calApi.view.type === 'dayGridMonth') calApi.changeView('listWeek');
    if (!isMobile && calApi.view.type === 'listWeek') calApi.changeView('dayGridMonth');
  }, [isMobile]);

  const events = useMemo(
    () =>
      bookings
        .filter((b) => !hiddenBuses.has(b.busId))
        .map((b) => ({
          id: String(b.id),
          title: `${b.busName} · ${b.title}${b.seriesId ? ' ↻' : ''} (${b.userDisplayName})`,
          start: b.start,
          end: b.end,
          backgroundColor: b.busColor,
          borderColor: b.busColor,
          extendedProps: { booking: b },
        })),
    [bookings, hiddenBuses]
  );

  const toggleBus = (id: number) => {
    setHiddenBuses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onDatesSet = (arg: DatesSetArg) => {
    const from = arg.start.toISOString();
    const to = arg.end.toISOString();
    // Nur bei tatsächlicher Änderung neuen State setzen, sonst rendert
    // FullCalendar in einer Endlosschleife (datesSet → setState → render → …)
    setRange((prev) => (prev && prev.from === from && prev.to === to ? prev : { from, to }));
  };

  const onSelect = (arg: DateSelectArg) => {
    let start = arg.start;
    let end = arg.end;
    if (arg.allDay) {
      // Auswahl im Monatsraster: sinnvolle Standard-Uhrzeiten vorbelegen
      start = new Date(arg.start);
      start.setHours(9, 0, 0, 0);
      end = new Date(arg.end);
      end.setDate(end.getDate() - 1);
      end.setHours(12, 0, 0, 0);
    }
    setDialog({ mode: 'create', start, end });
    calendarRef.current?.getApi().unselect();
  };

  const onEventClick = (arg: EventClickArg) => {
    setDetails(arg.event.extendedProps.booking as Booking);
  };

  const closeAndRefetch = () => {
    setDialog(null);
    setDetails(null);
    void refetch();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 overflow-x-auto py-1">
          {buses.map((bus) => {
            const hidden = hiddenBuses.has(bus.id);
            return (
              <button
                key={bus.id}
                onClick={() => toggleBus(bus.id)}
                title={`${bus.licensePlate} · ${bus.seats} Plätze`}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm ${
                  hidden ? 'opacity-40' : ''
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: bus.color }}
                  aria-hidden
                />
                <span className={hidden ? 'line-through' : ''}>{bus.name}</span>
              </button>
            );
          })}
          {buses.length === 0 && (
            <p className="text-sm text-gray-500">
              Noch keine Busse angelegt — ein Admin kann das unter „Verwaltung“ tun.
            </p>
          )}
        </div>
        <button
          onClick={() => setDialog({ mode: 'create' })}
          className="btn-primary hidden sm:block"
          disabled={buses.length === 0}
        >
          + Neue Buchung
        </button>
      </div>

      <div className="relative">
        {/* Wasserzeichen: Vereins-Schriftzug über dem Kalender, nicht klickbar */}
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
          aria-hidden
        >
          <img src={wortmarke} alt="" className="w-4/5 max-w-2xl opacity-[0.07]" />
        </div>
        <FullCalendar
          ref={calendarRef}
        plugins={PLUGINS}
        locales={[deLocale]}
        locale="de"
        initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
        headerToolbar={isMobile ? TOOLBAR_MOBILE : TOOLBAR_DESKTOP}
        buttonText={BUTTON_TEXT}
        events={events}
        datesSet={onDatesSet}
        selectable
        selectMirror
        select={onSelect}
        eventClick={onEventClick}
        height="auto"
        dayMaxEventRows={4}
        nowIndicator
      />
      </div>

      {/* Floating-Action-Button für Mobilgeräte */}
      <button
        onClick={() => setDialog({ mode: 'create' })}
        disabled={buses.length === 0}
        aria-label="Neue Buchung"
        className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-3xl leading-none text-white shadow-lg disabled:opacity-40 sm:hidden"
        style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        +
      </button>

      {dialog && (
        <BookingDialog
          buses={buses}
          state={dialog}
          onClose={() => setDialog(null)}
          onSaved={closeAndRefetch}
        />
      )}
      {details && (
        <BookingDetails
          booking={details}
          onClose={() => setDetails(null)}
          onEdit={() => {
            setDialog({ mode: 'edit', booking: details });
            setDetails(null);
          }}
          onChanged={closeAndRefetch}
        />
      )}
    </div>
  );
}
