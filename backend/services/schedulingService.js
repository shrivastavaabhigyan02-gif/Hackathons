/**
 * Order Scheduling Engine
 * Validates advance order requests against restaurant operating hours and kitchen cutoff rules.
 */

const schedulingService = {
  // Operating hours: 11:00 AM to 11:30 PM (23:30)
  OPENING_HOUR: 11,
  OPENING_MINUTE: 0,
  CLOSING_HOUR: 23,
  CLOSING_MINUTE: 30,
  MIN_NOTICE_MINUTES: 45, // Minimum 45 mins advance notice for scheduled orders
  MAX_DAYS_AHEAD: 7, // Can schedule up to 7 days in advance

  validateScheduleTime(scheduledDateStr) {
    if (!scheduledDateStr) {
      return { valid: false, message: 'Scheduled date and time are required.' };
    }

    const scheduledDate = new Date(scheduledDateStr);
    const now = new Date();

    if (isNaN(scheduledDate.getTime())) {
      return { valid: false, message: 'Invalid date/time format.' };
    }

    // 1. Cannot be in the past
    if (scheduledDate <= now) {
      return { valid: false, message: 'Scheduled time cannot be in the past.' };
    }

    // 2. Minimum notice period
    const diffMinutes = Math.round((scheduledDate - now) / 60000);
    if (diffMinutes < this.MIN_NOTICE_MINUTES) {
      return {
        valid: false,
        message: `Orders must be scheduled at least ${this.MIN_NOTICE_MINUTES} minutes in advance.`
      };
    }

    // 3. Max advance booking limit
    const diffDays = (scheduledDate - now) / (1000 * 60 * 60 * 24);
    if (diffDays > this.MAX_DAYS_AHEAD) {
      return {
        valid: false,
        message: `Orders can only be scheduled up to ${this.MAX_DAYS_AHEAD} days in advance.`
      };
    }

    // 4. Check operating hours
    const hours = scheduledDate.getHours();
    const minutes = scheduledDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    const openTimeInMinutes = this.OPENING_HOUR * 60 + this.OPENING_MINUTE;
    const closeTimeInMinutes = this.CLOSING_HOUR * 60 + this.CLOSING_MINUTE;

    if (timeInMinutes < openTimeInMinutes || timeInMinutes > closeTimeInMinutes) {
      return {
        valid: false,
        message: 'The kitchen is closed at the selected time. Folk & Flame operates daily from 11:00 AM to 11:30 PM.'
      };
    }

    return { valid: true, scheduledDate };
  }
};

module.exports = schedulingService;
