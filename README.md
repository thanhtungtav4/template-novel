# TruyệnStorm - Vietnamese Story Reading Platform

## 📚 Giới thiệu

TruyệnStorm là một nền tảng đọc truyện chữ online hiện đại, được thiết kế để mang đến trải nghiệm đọc truyện tuyệt vời cho độc giả Việt Nam. Website được xây dựng với công nghệ web hiện đại, tối ưu cho cả desktop và mobile.

## ✨ Tính năng chính

### 🎨 Giao diện người dùng
- **Responsive Design**: Tối ưu cho mọi thiết bị từ desktop đến mobile
- **Dark/Light Theme**: Chế độ sáng/tối để bảo vệ mắt
- **Modern UI**: Sử dụng Tailwind CSS với thiết kế hiện đại
- **Smooth Animations**: Hiệu ứng mượt mà và chuyên nghiệp

### 📖 Tính năng đọc truyện
- **Auto-scroll**: Tự động cuộn trang khi đọc
- **Reading Progress**: Theo dõi tiến độ đọc
- **Bookmark**: Đánh dấu chương yêu thích
- **Font Control**: Điều chỉnh kích thước chữ
- **Reading Mode**: Chế độ đọc tập trung

### 🔍 Tìm kiếm và khám phá
- **Advanced Search**: Tìm kiếm nâng cao theo thể loại, tác giả
- **Smart Filters**: Lọc theo trạng thái, đánh giá, lượt xem
- **Trending Stories**: Truyện hot, xu hướng
- **Recommendations**: Gợi ý truyện phù hợp

### 👤 Quản lý người dùng
- **User Profile**: Trang cá nhân với thống kê đọc truyện
- **Reading History**: Lịch sử đọc truyện
- **Favorites**: Danh sách truyện yêu thích
- **Reading Stats**: Thống kê thời gian đọc, số truyện đã đọc

### 📊 Admin Dashboard
- **Story Management**: Quản lý truyện, chương
- **User Analytics**: Thống kê người dùng
- **Traffic Monitoring**: Theo dõi lưu lượng truy cập
- **Content Moderation**: Kiểm duyệt nội dung

## 🛠️ Công nghệ sử dụng

### Frontend
- **HTML5**: Semantic markup, SEO-friendly
- **Tailwind CSS**: Utility-first CSS framework
- **Vanilla JavaScript**: ES6+, Modern JavaScript
- **Font Awesome**: Icon library
- **Google Fonts**: Typography (Inter font family)

### Progressive Web App (PWA)
- **Service Worker**: Offline support, caching
- **Web App Manifest**: App-like experience
- **Push Notifications**: Thông báo chương mới
- **Background Sync**: Đồng bộ dữ liệu nền

### Performance & SEO
- **Lazy Loading**: Tải hình ảnh theo yêu cầu
- **Critical Resource Preloading**: Tối ưu tốc độ tải
- **Structured Data**: Schema.org markup
- **Open Graph**: Social media sharing
- **Meta Tags**: SEO optimization

## 📁 Cấu trúc project

```
truyenstorm/
├── index.html              # Trang chủ
├── story-list.html         # Danh sách truyện
├── story-detail.html       # Chi tiết truyện
├── reader.html             # Trang đọc truyện
├── search.html             # Trang tìm kiếm
├── genres.html             # Thể loại truyện
├── profile.html            # Trang cá nhân
├── about.html              # Giới thiệu
├── contact.html            # Liên hệ
├── admin.html              # Dashboard admin
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── styles.css              # CSS cơ bản
├── advanced-styles.css     # CSS nâng cao
├── script.js               # JavaScript cơ bản
├── enhanced-script.js      # JavaScript cải tiến
├── advanced-features.js    # Tính năng nâng cao
├── api-simulator.js        # Mock API
└── README.md               # Tài liệu này
```

## 🚀 Cài đặt và chạy

### 1. Clone repository
```bash
git clone https://github.com/yourusername/truyenstorm.git
cd truyenstorm
```

### 2. Mở bằng live server
Sử dụng VS Code với extension Live Server hoặc bất kỳ HTTP server nào:

```bash
# Với Python
python -m http.server 8000

# Với Node.js (http-server)
npx http-server

# Với PHP
php -S localhost:8000
```

### 3. Truy cập website
Mở trình duyệt và truy cập `http://localhost:8000`

## 📱 Tính năng PWA

### Cài đặt như ứng dụng
- Chrome/Edge: Click "Cài đặt" trong thanh địa chỉ
- Safari: "Thêm vào màn hình chính"
- Firefox: "Cài đặt" trong menu

### Offline Support
- Đọc truyện đã tải về khi offline
- Đồng bộ tiến độ đọc khi online lại
- Cache thông minh cho trải nghiệm mượt mà

## ⚡ Tối ưu hiệu suất

### Lazy Loading
- Hình ảnh được tải khi cần thiết
- Giảm thời gian tải trang ban đầu
- Tiết kiệm băng thông

### Caching Strategy
- Service Worker cache tài nguyên quan trọng
- Browser cache cho assets tĩnh
- API response caching

### Code Splitting
- JavaScript được chia thành modules
- Chỉ tải code cần thiết cho từng trang
- Async loading cho tính năng nâng cao

---

**TruyệnStorm** - *Nơi hội tụ những câu chuyện hay nhất* 📚✨ - HTML Template with Tailwind CSS

A modern, responsive manga/anime website template built with HTML, Tailwind CSS, and vanilla JavaScript.

## Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Modern UI**: Clean, modern design inspired by popular manga reading websites
- **Tailwind CSS**: Utility-first CSS framework for rapid development
- **Interactive Elements**: JavaScript-powered search, navigation, and user interactions
- **Dark Mode Support**: Built-in dark/light theme toggle
- **Accessibility**: WCAG compliant with proper focus states and semantic HTML
- **Performance Optimized**: Lazy loading, optimized images, and minimal JavaScript

## Structure

```
manga template/
├── index.html          # Main HTML file
├── styles.css          # Custom CSS styles (complements Tailwind)
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Sections Included

1. **Header with Navigation**
   - Logo and branding
   - Search functionality
   - User authentication links
   - Responsive mobile menu

2. **Category Navigation**
   - Genre-based navigation
   - Dropdown menus for additional categories

3. **Hero Section**
   - Featured manga showcases
   - Eye-catching banners

4. **Popular Manga Updates**
   - Grid layout of popular manga
   - Chapter information and ratings

5. **Latest Releases**
   - List of recently updated manga
   - Star ratings and metadata

6. **Reading History Sidebar**
   - User's reading progress
   - Quick access to continue reading

7. **Footer**
   - Site links and information
   - Social media integration

## Technologies Used

- **HTML5**: Semantic markup
- **Tailwind CSS**: Utility-first CSS framework
- **Font Awesome**: Icons
- **Vanilla JavaScript**: Interactive functionality
- **CSS Grid & Flexbox**: Modern layout techniques

## Features in Detail

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible grid systems
- Touch-friendly navigation

### Interactive Elements
- Search with autocomplete suggestions
- Manga card hover effects
- Reading history tracking
- Theme switching (dark/light mode)
- Smooth scrolling navigation
- Form validation

### Performance Features
- Lazy loading for images
- Optimized CSS and JavaScript
- Minimal external dependencies
- Progressive Web App ready

### Accessibility
- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support
- High contrast ratios
- Screen reader friendly

## Customization

### Colors
The template uses a custom color scheme defined in the Tailwind config:
- **Primary**: `#ef4444` (Red)
- **Secondary**: `#1f2937` (Dark Gray)
- **Accent**: `#f59e0b` (Amber)

### Fonts
- Default system fonts for optimal performance
- Font Awesome for icons

### Layout
- Easy to modify grid layouts
- Customizable breakpoints
- Flexible component structure

## Browser Support

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

### Getting Started
1. Clone or download the template files
2. Open `index.html` in a web browser
3. Start customizing the content and styles

### Local Development
For the best development experience:
1. Use a local server (Live Server extension in VS Code)
2. Enable auto-reload for faster development
3. Use browser developer tools for debugging

### Customizing Tailwind
To modify Tailwind configuration:
1. Update the `tailwind.config` object in the HTML file
2. Add custom utilities in `styles.css`
3. Use Tailwind's JIT mode for production builds

## File Descriptions

### index.html
Main HTML file containing:
- Complete page structure
- Tailwind CSS integration
- Embedded Tailwind configuration
- Font Awesome integration
- Semantic HTML markup

### styles.css
Custom CSS enhancements:
- Animations and transitions
- Custom component styles
- Dark mode support
- Print styles
- Accessibility improvements

### script.js
JavaScript functionality:
- Search functionality
- Theme switching
- Mobile menu
- Interactive elements
- Lazy loading
- Form validation
- Notification system

## Deployment

### Static Hosting
The template can be deployed to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- Firebase Hosting
- AWS S3

### CDN Integration
- Tailwind CSS is loaded from CDN for easy setup
- Font Awesome loaded from CDN
- For production, consider bundling assets locally

## License

This template is free to use for personal and commercial projects.

## Contributing

Feel free to submit issues and enhancement requests!

## Changelog

### Version 1.0.0
- Initial release
- Responsive design
- Dark mode support
- Interactive elements
- Accessibility features

## Support

For questions or support, please refer to the documentation or create an issue in the repository.
