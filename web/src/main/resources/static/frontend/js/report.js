let currentReportId = null;

function openReportModal(id) {
    currentReportId = id;
    document.getElementById('reportModal').style.display = 'flex';
}

function closeReportModal() {
    document.getElementById('reportModal').style.display = 'none';
}

async function submitReport() {
    const reason = document.getElementById('reportReason').value;
    const user = JSON.parse(localStorage.getItem('user'));
    const reporterId = user ? user.account_id : null;

    const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            reporter_id: reporterId,
            message_id: currentReportId,
            reason: reason
        })
    });

    const data = await response.json();
    alert(data.message);
    closeReportModal();
}
