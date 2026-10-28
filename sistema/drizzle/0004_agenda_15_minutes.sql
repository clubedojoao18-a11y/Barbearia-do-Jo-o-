-- Expand each occupied legacy half-hour into two quarter-hour locks.
-- Existing appointment times, durations, prices and statuses are preserved.
-- Apply before enabling the 15-minute booking grid, in every existing namespace.
INSERT INTO slots(barber_id,date,time,appointment_id)
SELECT barber_id,date,substr(time,1,3) || printf('%02d',CAST(substr(time,4,2) AS INTEGER)+15),appointment_id
FROM slots
WHERE substr(time,4,2) IN ('00','30');
