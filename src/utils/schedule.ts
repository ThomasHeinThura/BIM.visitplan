export const OFFICE_START_MINUTES = 9 * 60;
export const OFFICE_END_MINUTES = 17 * 60;
export const OFFICE_SLOT_MINUTES = 15;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function roundMinutes(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

export function parseTimeToMinutes(value: string) {
  const [hour = '09', minute = '00'] = value.split(':');
  return Number(hour) * 60 + Number(minute);
}

export function timeValueFromMinutes(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${pad(hour)}:${pad(minute)}`;
}

export function formatDisplayTime(value: string) {
  const totalMinutes = parseTimeToMinutes(value);
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${pad(minute)} ${meridiem}`;
}

export function isOutsideOfficeHours(value: string) {
  const totalMinutes = parseTimeToMinutes(value);
  return totalMinutes < OFFICE_START_MINUTES || totalMinutes > OFFICE_END_MINUTES;
}

export function addMinutes(value: string, minutesToAdd: number) {
  return timeValueFromMinutes(parseTimeToMinutes(value) + minutesToAdd);
}

export function getOfficeTimeOptions(maxMinutes = OFFICE_END_MINUTES) {
  const options: string[] = [];
  for (let current = OFFICE_START_MINUTES; current <= maxMinutes; current += OFFICE_SLOT_MINUTES) {
    options.push(timeValueFromMinutes(current));
  }
  return options;
}

export function getCurrentOfficeScheduleDefaults(now = new Date()) {
  const roundedMinutes = roundMinutes(now.getMinutes(), OFFICE_SLOT_MINUTES);
  let startMinutes = now.getHours() * 60 + roundedMinutes;

  if (roundedMinutes >= 60) {
    startMinutes = (now.getHours() + 1) * 60;
  }

  const latestStart = OFFICE_END_MINUTES - 60;
  const clampedStart = Math.min(Math.max(startMinutes, OFFICE_START_MINUTES), latestStart);
  const startTime = timeValueFromMinutes(clampedStart);

  return {
    date: now.toISOString().slice(0, 10),
    startTime,
    endTime: addMinutes(startTime, 60),
  };
}