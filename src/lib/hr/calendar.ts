import NationalHoliday from "@/models/NationalHoliday";
import WorkSchedule from "@/models/WorkSchedule";
import EmployeeSchedule from "@/models/EmployeeSchedule";
import Branch from "@/models/Branch";
import { connectToDatabase } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { eachDayKey, isWeekendKey, wibEndOfDay, wibStartOfDay } from "@/lib/time";

/** All active national-holiday day keys in a range, mapped to their names. */
export async function holidayMap(
  startKey: string,
  endKey: string
): Promise<Map<string, { name: string; type: string }>> {
  await connectToDatabase();
  const rows = await NationalHoliday.find({
    isActive: true,
    dateKey: { $gte: startKey, $lte: endKey },
  }).lean<Array<{ dateKey: string; name: string; type: string }>>();
  return new Map(rows.map((r) => [r.dateKey, { name: r.name, type: r.type }]));
}

export async function isHoliday(dateKey: string): Promise<boolean> {
  const map = await holidayMap(dateKey, dateKey);
  return map.has(dateKey);
}

export interface LeaveDayBreakdown {
  /** Days actually charged against the employee's balance. */
  chargedDays: number;
  /** Total calendar days in the requested range. */
  calendarDays: number;
  /** Day keys that were skipped, with the reason shown back to the user. */
  skipped: Array<{ dateKey: string; reason: string }>;
}

/**
 * Counts how many days a leave request consumes.
 *
 * With `leave_count_mode = working_days` (the default), weekends and national
 * holidays inside the range do not eat the employee's quota — the previous
 * implementation charged every calendar day, so a Friday-to-Monday request cost
 * four days instead of two.
 */
export async function countLeaveDays(
  startKey: string,
  endKey: string
): Promise<LeaveDayBreakdown> {
  const days = eachDayKey(startKey, endKey);
  const settings = await getSettings();
  const mode = String(settings.leave_count_mode ?? "working_days");

  if (mode === "calendar_days") {
    return { chargedDays: days.length, calendarDays: days.length, skipped: [] };
  }

  const holidays = await holidayMap(startKey, endKey);
  const skipped: LeaveDayBreakdown["skipped"] = [];
  let charged = 0;

  for (const key of days) {
    const holiday = holidays.get(key);
    if (holiday && holiday.type === "libur_nasional") {
      skipped.push({ dateKey: key, reason: holiday.name });
    } else if (isWeekendKey(key)) {
      skipped.push({ dateKey: key, reason: "Akhir pekan" });
    } else {
      charged++;
    }
  }

  return { chargedDays: charged, calendarDays: days.length, skipped };
}

export interface ResolvedSchedule {
  /** `HH:mm` WIB. */
  clockIn: string;
  clockOut: string;
  breakOut?: string;
  breakIn?: string;
  isBreakActive: boolean;
  gracePeriodMinutes: number;
  /** Where the values came from, for the UI to explain itself. */
  source: "employee_schedule" | "branch_default";
  scheduleName: string;
}

/**
 * Resolves the work schedule that applies to an employee on a WIB day.
 *
 * Order of precedence: an explicit per-day assignment (shift roster) first,
 * then the branch's operating hours as the backstop. Grace period follows the
 * same order, with the global CMS setting as the final default.
 */
export async function resolveSchedule(
  employeeId: string,
  dateKey: string,
  branch?: { workHours?: { start?: string; end?: string }; name?: string } | null
): Promise<ResolvedSchedule> {
  await connectToDatabase();
  const settings = await getSettings();
  const globalGrace = Number(settings.grace_period_minutes ?? 1);
  const breakEnabled = Boolean(settings.enable_break_attendance);

  const assignment = await EmployeeSchedule.findOne({
    employeeId,
    date: { $gte: wibStartOfDay(dateKey), $lte: wibEndOfDay(dateKey) },
  })
    .populate("scheduleId")
    .lean<{ scheduleId?: Record<string, unknown> } | null>();

  const schedule = assignment?.scheduleId as
    | {
        name?: string;
        clockIn?: string;
        clockOut?: string;
        breakOut?: string;
        breakIn?: string;
        isBreakActive?: boolean;
        gracePeriodMinutes?: number;
      }
    | undefined;

  if (schedule?.clockIn) {
    return {
      clockIn: schedule.clockIn,
      clockOut: schedule.clockOut ?? "17:00",
      breakOut: schedule.breakOut,
      breakIn: schedule.breakIn,
      isBreakActive: breakEnabled && schedule.isBreakActive !== false,
      gracePeriodMinutes:
        typeof schedule.gracePeriodMinutes === "number" ? schedule.gracePeriodMinutes : globalGrace,
      source: "employee_schedule",
      scheduleName: schedule.name ?? "Jadwal individual",
    };
  }

  return {
    clockIn: branch?.workHours?.start ?? "09:00",
    clockOut: branch?.workHours?.end ?? "17:00",
    isBreakActive: breakEnabled,
    gracePeriodMinutes: globalGrace,
    source: "branch_default",
    scheduleName: branch?.name ? `Jam operasional ${branch.name}` : "Jam kerja default",
  };
}

/** Lists the branches an attendance attempt may legitimately match. */
export async function listBranches() {
  await connectToDatabase();
  return Branch.find({})
    .select("name lat lng radiusMeter workHours address")
    .lean<
      Array<{
        _id: unknown;
        name: string;
        lat: number;
        lng: number;
        radiusMeter: number;
        address: string;
        workHours?: { start?: string; end?: string };
      }>
    >();
}

export { WorkSchedule };
