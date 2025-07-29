// Advanced Features v2.0
class TruyenStormApp {
    constructor() {
        this.init();
        this.registerServiceWorker();
        this.setupOfflineSupport();
        this.setupPerformanceOptimizations();
    }

    init() {
        this.setupLazyLoading();
        this.setupIntersectionObserver();
        this.setupKeyboardShortcuts();
        this.setupReadingProgress();
        this.setupUserPreferences();
        this.setupNotifications();
    }

    // Service Worker Registration
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        }
    }

    // Lazy Loading with Intersection Observer
    setupLazyLoading() {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('skeleton');
                    img.classList.add('animate-in');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            img.classList.add('skeleton');
            imageObserver.observe(img);
        });
    }

    // Performance Optimizations
    setupPerformanceOptimizations() {
        // Debounce scroll events
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            if (scrollTimeout) clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.handleScroll();
            }, 16); // 60fps
        }, { passive: true });

        // Preload critical resources
        this.preloadCriticalResources();
    }

    preloadCriticalResources() {
        const criticalPages = ['/story-list.html', '/search.html'];
        criticalPages.forEach(page => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = page;
            document.head.appendChild(link);
        });
    }

    // Advanced Intersection Observer for animations
    setupIntersectionObserver() {
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '50px'
        });

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            animationObserver.observe(el);
        });
    }

    // Keyboard Shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.openSearch();
            }
            
            // ESC to close modals
            if (e.key === 'Escape') {
                this.closeModals();
            }

            // Arrow keys for navigation in reader
            if (window.location.pathname.includes('reader.html')) {
                if (e.key === 'ArrowLeft') this.previousChapter();
                if (e.key === 'ArrowRight') this.nextChapter();
            }
        });
    }

    // Reading Progress Tracking
    setupReadingProgress() {
        if (!window.location.pathname.includes('reader.html')) return;

        const content = document.querySelector('.story-content');
        if (!content) return;

        let progressTimeout;
        window.addEventListener('scroll', () => {
            if (progressTimeout) clearTimeout(progressTimeout);
            progressTimeout = setTimeout(() => {
                this.saveReadingProgress();
            }, 1000);
        }, { passive: true });
    }

    saveReadingProgress() {
        const scrollPercent = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        
        const storyId = this.getStoryIdFromUrl();
        const chapter = this.getChapterFromUrl();
        
        const progress = {
            storyId,
            chapter,
            scrollPercent,
            timestamp: Date.now()
        };

        localStorage.setItem(`progress_${storyId}_${chapter}`, JSON.stringify(progress));
        
        // Update progress ring if exists
        this.updateProgressRing(scrollPercent);
    }

    updateProgressRing(percent) {
        const ring = document.querySelector('.progress-ring-circle');
        if (ring) {
            const circumference = 2 * Math.PI * 45; // radius = 45
            const offset = circumference - (percent / 100) * circumference;
            ring.style.strokeDashoffset = offset;
        }
    }

    // User Preferences
    setupUserPreferences() {
        this.loadUserPreferences();
        this.setupThemeToggle();
        this.setupFontSizeControls();
        this.setupReadingModeControls();
    }

    loadUserPreferences() {
        const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
        
        // Apply theme
        if (preferences.theme) {
            document.documentElement.setAttribute('data-theme', preferences.theme);
        }

        // Apply font size
        if (preferences.fontSize) {
            document.documentElement.style.fontSize = preferences.fontSize + 'px';
        }

        // Apply reading mode
        if (preferences.readingMode && window.location.pathname.includes('reader.html')) {
            this.applyReadingMode(preferences.readingMode);
        }
    }

    setupThemeToggle() {
        const themeToggle = document.querySelector('#theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                this.savePreference('theme', newTheme);
                
                // Update icon
                const icon = themeToggle.querySelector('i');
                icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            });
        }
    }

    // Push Notifications
    setupNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            this.requestNotificationPermission();
        }
    }

    async requestNotificationPermission() {
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                this.showWelcomeNotification();
            }
        }
    }

    showWelcomeNotification() {
        new Notification('Chào mừng đến với TruyệnStorm!', {
            body: 'Bạn sẽ nhận được thông báo khi có chương mới',
            icon: '/icon-192.png',
            badge: '/badge-72.png'
        });
    }

    // Advanced Search
    setupAdvancedSearch() {
        const searchInput = document.querySelector('#search-input');
        if (!searchInput) return;

        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });
    }

    async performSearch(query) {
        if (query.length < 2) return;

        try {
            // Simulate API call
            const results = await this.searchAPI(query);
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    searchAPI(query) {
        // Simulate search with local data
        return new Promise(resolve => {
            setTimeout(() => {
                const mockResults = [
                    { id: 1, title: 'Thiên Long Bát Bộ', author: 'Kim Dung' },
                    { id: 2, title: 'Thần Điêu Đại Hiệp', author: 'Kim Dung' },
                    { id: 3, title: 'Tiếu Ngạo Giang Hồ', author: 'Kim Dung' }
                ].filter(item => 
                    item.title.toLowerCase().includes(query.toLowerCase()) ||
                    item.author.toLowerCase().includes(query.toLowerCase())
                );
                resolve(mockResults);
            }, 200);
        });
    }

    // Offline Support
    setupOfflineSupport() {
        window.addEventListener('online', () => {
            this.showToast('Đã kết nối internet', 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.showToast('Đang offline - Một số tính năng có thể bị hạn chế', 'warning');
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white ${
            type === 'success' ? 'bg-green-500' : 
            type === 'warning' ? 'bg-yellow-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } animate-in`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Utility Methods
    getStoryIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || 'unknown';
    }

    getChapterFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('chapter') || '1';
    }

    savePreference(key, value) {
        const preferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
        preferences[key] = value;
        localStorage.setItem('userPreferences', JSON.stringify(preferences));
    }

    openSearch() {
        const searchModal = document.querySelector('#search-modal');
        if (searchModal) {
            searchModal.classList.remove('hidden');
            const input = searchModal.querySelector('input');
            if (input) input.focus();
        }
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.add('hidden');
        });
    }

    handleScroll() {
        // Handle scroll-based animations and effects
        const scrolled = window.scrollY;
        const rate = scrolled * -0.5;
        
        // Parallax effect for hero section
        const hero = document.querySelector('.hero-bg');
        if (hero) {
            hero.style.transform = `translateY(${rate}px)`;
        }

        // Update reading progress
        if (window.location.pathname.includes('reader.html')) {
            this.updateReadingProgress();
        }
    }

    updateReadingProgress() {
        const scrollPercent = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        
        // Update progress bar
        const progressBar = document.querySelector('.reading-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${scrollPercent}%`;
        }

        // Update progress ring
        this.updateProgressRing(scrollPercent);
    }

    // Chapter Navigation
    previousChapter() {
        const currentChapter = parseInt(this.getChapterFromUrl());
        if (currentChapter > 1) {
            this.navigateToChapter(currentChapter - 1);
        }
    }

    nextChapter() {
        const currentChapter = parseInt(this.getChapterFromUrl());
        this.navigateToChapter(currentChapter + 1);
    }

    navigateToChapter(chapter) {
        const params = new URLSearchParams(window.location.search);
        params.set('chapter', chapter);
        window.location.search = params.toString();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TruyenStormApp();
});

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TruyenStormApp;
}
