async function loadReports() {
    const container = document.getElementById('reportsList');
    const tpl = document.getElementById('tpl-report');
    
    try {
        const response = await fetch(`${API}/moderator/reports`);
        const reports = await response.json();
        
        container.innerHTML = '';

        if (reports.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #7f8c8d; background: #fff; border-radius: 8px;">No reports pending review. 🎉</div>';
            return;
        }

        reports.forEach(r => {
            const clone = tpl.content.cloneNode(true);
            clone.querySelector('.report-reason').textContent = r.reason;
            clone.querySelector('.report-content').textContent = `"${r.content}"`;
            clone.querySelector('.reporter').textContent = r.reporter_email || 'Anonymous';
            clone.querySelector('.report-date').textContent = new Date(r.created_at).toLocaleString();

            clone.querySelector('.btn-delete').onclick = () => handleReport(r.report_id, r.message_id, 'delete');
            clone.querySelector('.btn-ignore').onclick = () => handleReport(r.report_id, r.message_id, 'ignore');

            container.appendChild(clone);
        });
    } catch (error) {
        console.error("Error loading reports:", error);
        container.innerHTML = '<div style="color: red;">Failed to load reports. Please try again later.</div>';
    }
}

async function handleReport(reportId, messageId, action) {
    if (action === 'delete' && !confirm("Are you sure you want to delete this post?")) return;

    try {
        const response = await fetch(`${API}/moderator/resolve-report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ report_id: reportId, message_id: messageId, action: action })
        });

        const result = await response.json();
        
        // Dùng showToast nếu bạn có sẵn hàm này trong common.js, nếu không thì dùng alert()
        if (typeof showToast === 'function') {
            showToast(action === 'delete' ? '✓ Post deleted' : '✓ Report ignored');
        } else {
            alert(result.message || 'Action completed');
        }
        
        loadReports(); // Tải lại danh sách sau khi xử lý
    } catch (error) {
        console.error("Error handling report:", error);
        if (typeof showToast === 'function') {
            showToast("Error processing report");
        } else {
            alert("An error occurred while processing the report.");
        }
    }
}

// Khởi chạy khi load trang
async function initReports() {
    if (typeof loadSession === 'function' && !loadSession('moderator')) return;
    if (typeof renderTopbar === 'function') renderTopbar();
    
    await loadReports();
}

initReports();
