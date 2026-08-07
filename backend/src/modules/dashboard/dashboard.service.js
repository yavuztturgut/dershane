const dashboardRepository = require('./dashboard.repository');

function decorateSchedule(schedule, now) {
    const startsAt = new Date(schedule.start_time).getTime();
    const endsAt = new Date(schedule.end_time).getTime();
    const studentCount = Number(schedule.student_count);
    const recordedCount = Number(schedule.recorded_count);
    const temporalStatus = startsAt > now
        ? 'upcoming'
        : endsAt > now ? 'ongoing' : 'ended';
    let attendanceStatus = 'not_due';

    if (studentCount === 0) attendanceStatus = 'no_students';
    else if (temporalStatus === 'ended') {
        attendanceStatus = recordedCount === studentCount ? 'complete' : 'missing';
    }

    return {
        ...schedule,
        student_count: studentCount,
        recorded_count: recordedCount,
        temporal_status: temporalStatus,
        attendance_status: attendanceStatus,
    };
}

function buildSummary({ totals, todaySchedules, weeklyAttendance }, currentTime = new Date()) {
    const now = currentTime.getTime();
    const schedules = todaySchedules.map((schedule) => decorateSchedule(schedule, now));

    return {
        ...totals,
        today: {
            lessons: schedules.length,
            remaining: schedules.filter((schedule) => schedule.temporal_status !== 'ended').length,
            attendanceCompleted: schedules.filter((schedule) => schedule.attendance_status === 'complete').length,
            attendanceMissing: schedules.filter((schedule) => schedule.attendance_status === 'missing').length,
        },
        todaySchedules: schedules,
        weeklyAttendance,
    };
}

async function getSummary() {
    return buildSummary(await dashboardRepository.getDashboardData());
}

module.exports = { buildSummary, getSummary };
