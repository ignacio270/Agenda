// ============================================================
//  AGENDA — Apps Script Backend  (Code.gs)
//  Sirve como API JSON con CORS para la PWA externa
// ============================================================

var CALENDAR_ID = 'primary';
var DAYS_AHEAD  = 14;

// ── Punto de entrada ─────────────────────────────────────────
function doGet(e) {
  var action = e.parameter.action;

  // Modo API: devuelve JSON (CORS automático en ContentService)
  if (action) {
    var result;
    try {
      if      (action === 'list')   { result = { ok:true, events: getEvents() }; }
      else if (action === 'create') { result = createEvent(JSON.parse(e.parameter.data)); }
      else if (action === 'update') { result = updateEvent(JSON.parse(e.parameter.data)); }
      else if (action === 'delete') { result = deleteEvent(e.parameter.id); }
      else                          { result = { ok:false, error:'Acción desconocida.' }; }
    } catch(err) {
      result = { ok:false, error: err.message || String(err) };
    }
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Modo HTML (fallback para Google Sites)
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('Agenda')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ── Leer eventos ──────────────────────────────────────────────
function getEvents() {
  var now = new Date();
  var end = new Date(now.getTime() + DAYS_AHEAD * 86400000);
  var cal = CalendarApp.getCalendarById(CALENDAR_ID) || CalendarApp.getDefaultCalendar();
  return cal.getEvents(now, end).map(function(ev) {
    var allDay = ev.isAllDayEvent();
    return {
      id:          ev.getId(),
      summary:     ev.getTitle()       || '(Sin título)',
      location:    ev.getLocation()    || '',
      description: ev.getDescription() || '',
      allDay:      allDay,
      start: allDay
        ? Utilities.formatDate(ev.getAllDayStartDate(), 'Europe/Madrid', 'yyyy-MM-dd')
        : ev.getStartTime().toISOString(),
      end: allDay
        ? Utilities.formatDate(ev.getAllDayEndDate(), 'Europe/Madrid', 'yyyy-MM-dd')
        : ev.getEndTime().toISOString(),
    };
  });
}

// ── Crear evento ──────────────────────────────────────────────
function createEvent(d) {
  var cal = CalendarApp.getCalendarById(CALENDAR_ID) || CalendarApp.getDefaultCalendar();
  var ev;
  if (d.allDay) {
    ev = cal.createAllDayEvent(d.summary, parseDateLocal(d.date));
  } else {
    ev = cal.createEvent(d.summary,
      new Date(d.date + 'T' + d.startTime + ':00'),
      new Date(d.date + 'T' + d.endTime   + ':00'));
  }
  if (d.location)    ev.setLocation(d.location);
  if (d.description) ev.setDescription(d.description);
  return { ok:true, id: ev.getId() };
}

// ── Actualizar evento ─────────────────────────────────────────
function updateEvent(d) {
  var ev = CalendarApp.getEventById(d.id);
  if (!ev) return { ok:false, error:'Evento no encontrado.' };
  ev.setTitle(d.summary);
  ev.setLocation(d.location || '');
  if (d.allDay) {
    ev.setAllDayDate(parseDateLocal(d.date));
  } else {
    ev.setTime(
      new Date(d.date + 'T' + d.startTime + ':00'),
      new Date(d.date + 'T' + d.endTime   + ':00')
    );
  }
  return { ok:true };
}

// ── Eliminar evento ───────────────────────────────────────────
function deleteEvent(eventId) {
  var ev = CalendarApp.getEventById(eventId);
  if (!ev) return { ok:false, error:'Evento no encontrado.' };
  ev.deleteEvent();
  return { ok:true };
}

// ── Util ──────────────────────────────────────────────────────
function parseDateLocal(s) {
  var p = s.split('-');
  return new Date(+p[0], +p[1]-1, +p[2], 0, 0, 0);
}
