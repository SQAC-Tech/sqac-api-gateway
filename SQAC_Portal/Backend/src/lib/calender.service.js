// calendar.service.js

// Format date for Google Calendar (YYYYMMDDTHHMMSSZ)
const formatDateForGoogleCalendar = (date, time) => {
    // Combine date and time
    const dateTimeString = `${date}T${time}:00`;
    const eventDate = new Date(dateTimeString);

    // Format to UTC string without special characters
    const year = eventDate.getUTCFullYear();
    const month = String(eventDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getUTCDate()).padStart(2, '0');
    const hours = String(eventDate.getUTCHours()).padStart(2, '0');
    const minutes = String(eventDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(eventDate.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

// Generate Google Calendar link
const generateGoogleCalendarLink = (title, startDate, startTime, description, meetLink) => {
    // Calculate end time (default: 1 hour after start time)
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 3600000); // +1 hour

    const endDate = endDateTime.toISOString().split('T')[0];
    const endTimeFormatted = endDateTime.toTimeString().split(' ')[0].substring(0, 5);

    // Format dates for Google Calendar
    const formattedStart = formatDateForGoogleCalendar(startDate, startTime);
    const formattedEnd = formatDateForGoogleCalendar(endDate, endTimeFormatted);

    // Encode parameters for URL
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description || '');
    const encodedLocation = encodeURIComponent(meetLink);

    // Build the Google Calendar URL
    const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodedTitle}&dates=${formattedStart}/${formattedEnd}&details=${encodedDescription}&location=${encodedLocation}`;

    return calendarUrl;
};

export { generateGoogleCalendarLink, formatDateForGoogleCalendar };
