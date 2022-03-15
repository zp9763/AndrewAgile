export function formatDateTime(datetimeStr) {
    let datetime = new Date(datetimeStr);
    return datetime.toLocaleDateString() + " " +
        datetime.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
}
