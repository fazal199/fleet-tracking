// Helper function to format Date to "yyyy-MM-dd HH:mm:ss" in Asia/Kolkata timezone
function formatDateToIST(date) {
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kolkata'
    };
    // toLocaleString will return "DD/MM/YYYY, HH:MM:SS" so we need to reformat it.
    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function convertISOToISTFormatted(isoString, originalZone = "Asia/Kolkata") {
    // Create a new Date object from the ISO string. This will parse it as UTC if it has 'Z' or a timezone offset.
    // Otherwise, it will parse as local time. We need to be careful with implicit timezones.
    const date = new Date(isoString);

    // For the purpose of this replacement, we'll assume the original ISO string 
    // is either in UTC or already correctly represents Asia/Kolkata time 
    // and the goal is just to format it to IST.
    // If originalZone truly meant parsing it *as if* it were in that zone, 
    // without an offset, more complex logic would be needed.

    return formatDateToIST(date);
}


module.exports = {
    convertISOToISTFormatted,
    formatDateToIST
}