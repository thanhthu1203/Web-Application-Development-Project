async function loadReports() {
    const response = await fetch('/api/moderator/reports');
    const reports = await response.json();
    const container = document.getElementById('reportsList');
    const tpl = document.getElementById('tpl-report');
    container.innerHTML = '';

    if (reports.length === 0) {
        container.innerHTML = '<p>No reports pending review. 🎉</p>';
        return;
    }

    reports.forEach(r => {
        const clone = tpl.content.cloneNode(true);
        clone.querySelector('.report-reason').textContent = r.reason;
        clone.querySelector('.report-content').textContent = `Reported content: "${r.content}"`;
        clone.querySelector('.reporter').textContent = r.reporter_email || 'Anonymous';
        clone.querySelector('.report-date').textContent = new Date(r.created_at).toLocaleString();

        // Delete post button
        clone.querySelector('.btn-delete').onclick = () => handleReport(r.report_id, r.message_id, 'delete');
        // Ignore button
        clone.querySelector('.btn-ignore').onclick = () => handleReport(r.report_id, r.message_id, 'ignore');

        container.appendChild(clone);
    });
}

async function handleReport(reportId, messageId, action) {
    if (action === 'delete' && !confirm("Are you sure you want to delete this post?")) return;

    try {
        const response = await fetch('/api/moderator/resolve-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ report_id: reportId, message_id: messageId, action: action })
        });

        const result = await response.json();
        alert(result.message);
        loadReports(); // Reload list after processing
    } catch (error) {
        console.error("Error handling report:", error);
        alert("An error occurred while processing the report.");
    }
}

// Initialize
loadReports();
