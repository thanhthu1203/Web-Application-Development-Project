/* file này sẽ chứa code chung để tự động nhận diện tab hiện tại và tô sáng menu tương ứng trong sidebar. Mỗi trang HTML sẽ khai báo biến __ACTIVE_TAB__ để xác định tab nào đang active. */

document.addEventListener("DOMContentLoaded", () => {
  // Kiểm tra xem trang HTML hiện tại có khai báo biến __ACTIVE_TAB__ không
  if (window.__ACTIVE_TAB__) {
    
    // 1. Tìm tất cả các thẻ menu (nav-item) trong sidebar
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    
    // 2. Xóa class 'active' ở tất cả các menu để reset
    navItems.forEach(item => item.classList.remove('active'));

    // 3. Tìm đúng menu tương ứng với trang hiện tại và thêm class 'active'
    const activeItem = document.querySelector(`.sidebar-nav .nav-item[data-tab="${window.__ACTIVE_TAB__}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }
});