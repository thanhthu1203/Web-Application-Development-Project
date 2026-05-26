async function loadReports() {
    const response = await fetch('/api/moderator/reports');
    const reports = await response.json();
    const container = document.getElementById('reportsList');
    const tpl = document.getElementById('tpl-report');
    container.innerHTML = '';

    if (reports.length === 0) {
        container.innerHTML = '<p>Hiện không có báo cáo nào cần xử lý. 🎉</p>';
        return;
    }

    reports.forEach(r => {
        const clone = tpl.content.cloneNode(true);
        clone.querySelector('.report-reason').textContent = r.reason;
        clone.querySelector('.report-content').textContent = `Nội dung bị báo cáo: "${r.content}"`;
        clone.querySelector('.reporter').textContent = r.reporter_email || 'Ẩn danh';
        clone.querySelector('.report-date').textContent = new Date(r.created_at).toLocaleString();

        // Nút Xóa bài
        clone.querySelector('.btn-delete').onclick = () => handleReport(r.report_id, r.message_id, 'delete');
        // Nút Bỏ qua
        clone.querySelector('.btn-ignore').onclick = () => handleReport(r.report_id, r.message_id, 'ignore');

        container.appendChild(clone);
    });
}

async function handleReport(reportId, messageId, action) {
    if (action === 'delete' && !confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;

    const response = await fetch('/api/moderator/resolve-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, message_id: messageId, action: action })
    });

    const result = await response.json();
    alert(result.message);
    loadReports(); // Tải lại danh sách sau khi xử lý
}

// Khởi chạy
loadReports();
