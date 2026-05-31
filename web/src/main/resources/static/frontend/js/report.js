// let currentReportId = null;

// function openReportModal(id) {
//     currentReportId = id;
//     document.getElementById('reportModal').style.display = 'flex';
// }

// function closeReportModal() {
//     document.getElementById('reportModal').style.display = 'none';
//     document.getElementById('reportReason').value = 'Spam or Scam'; // reset select
// }

// async function submitReport() {
//     const reason = document.getElementById('reportReason').value;
//     const token = localStorage.getItem('token') || sessionStorage.getItem('token');

//     try {
//         const response = await fetch('/api/report', {
//             method: 'POST',
//             headers: { 
//                 'Content-Type': 'application/json',
//                 'Authorization': token ? `Bearer ${token}` : ''
//             },
//             body: JSON.stringify({
//                 message_id: currentReportId,
//                 reason: reason
//             })
//         });

//         const data = await response.json();
//         alert(data.message);
        
//         if (response.ok) {
//             closeReportModal();
//         }
//     } catch (error) {
//         console.error(error);
//         alert("Error submitting report to server!");
//     }
// }