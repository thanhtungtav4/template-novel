// Defensive advanced enhancements. This file avoids overriding core interactions.

class TruyenStormApp {
    constructor() {
        this.init();
        this.registerServiceWorker();
    }

    init() {
        this.setupIntersectionObserver();
        this.setupKeyboardShortcuts();
        this.setupOfflineSupport();
        this.setupReaderProgress();
        this.loadUserPreferences();
        this.preloadCriticalPages();
    }

    registerServiceWorker() {
        if (!('serviceWorker' in navigator) || window.__tsSwRegistered) {
            return;
        }

        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                window.__tsSwRegistered = true;
                console.log('SW registered:', registration.scope);
            })
            .catch((error) => {
                console.log('SW registration failed:', error);
            });
    }

    setupIntersectionObserver() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const observer = new IntersectionObserver((entries, instance) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    instance.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '30px'
        });

        document.querySelectorAll('.animate-on-scroll').forEach((element) => {
            observer.observe(element);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + K focuses the first search field.
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                const searchInput = document.querySelector('input[type="search"]');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            if (event.key === 'Escape') {
                this.closeMobileMenuIfOpen();
                this.closeVisibleModals();
            }

            if (window.location.pathname.includes('reader.html')) {
                if (event.key === 'ArrowLeft') {
                    this.previousChapter();
                }

                if (event.key === 'ArrowRight') {
                    this.nextChapter();
                }
            }
        });
    }

    closeMobileMenuIfOpen() {
        const menu = document.getElementById('mobile-menu');
        const button = document.getElementById('mobile-menu-button');

        if (!menu || menu.classList.contains('hidden')) {
            return;
        }

        menu.classList.add('hidden');
        menu.setAttribute('aria-hidden', 'true');

        if (button) {
            button.setAttribute('aria-expanded', 'false');
            button.innerHTML = '<i class="fas fa-bars text-xl"></i>';
        }

        document.body.style.overflow = '';
    }

    closeVisibleModals() {
        document.querySelectorAll('.modal:not(.hidden)').forEach((modal) => {
            modal.classList.add('hidden');
        });
    }

    setupReaderProgress() {
        if (!window.location.pathname.includes('reader.html')) {
            return;
        }

        const progressBar = this.ensureProgressBar();
        const updateProgress = this.throttle(() => {
            const maxScrollable = document.documentElement.scrollHeight - window.innerHeight;
            const percent = maxScrollable > 0 ? Math.round((window.scrollY / maxScrollable) * 100) : 0;

            progressBar.style.width = `${percent}%`;
            this.saveReaderProgress(percent);
        }, 200);

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    }

    ensureProgressBar() {
        let bar = document.querySelector('.reading-progress-bar');
        if (bar) {
            return bar;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'fixed top-0 left-0 z-50 h-1 w-full bg-transparent';

        bar = document.createElement('div');
        bar.className = 'reading-progress-bar h-full bg-primary transition-all duration-150';
        bar.style.width = '0%';

        wrapper.appendChild(bar);
        document.body.appendChild(wrapper);
        return bar;
    }

    saveReaderProgress(scrollPercent) {
        const storyId = this.getStoryIdFromUrl();
        const chapter = this.getChapterFromUrl();
        const key = `progress_${storyId}_${chapter}`;

        const payload = {
            storyId,
            chapter,
            scrollPercent,
            timestamp: Date.now()
        };

        localStorage.setItem(key, JSON.stringify(payload));
    }

    loadUserPreferences() {
        const savedTheme = localStorage.getItem('ts-theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', savedTheme);
            document.body.classList.toggle('dark-mode', savedTheme === 'dark');
        }

        const legacyPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
        if (legacyPreferences.fontSize) {
            document.documentElement.style.fontSize = `${legacyPreferences.fontSize}px`;
        }
    }

    preloadCriticalPages() {
        const pages = ['/story-list.html', '/search.html'];

        pages.forEach((href) => {
            if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) {
                return;
            }

            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = href;
            document.head.appendChild(link);
        });
    }

    setupOfflineSupport() {
        window.addEventListener('online', () => {
            this.showToast('Đã kết nối internet', 'success');
        });

        window.addEventListener('offline', () => {
            this.showToast('Bạn đang offline, một số tính năng có thể hạn chế.', 'warning');
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const color = {
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        }[type] || 'bg-blue-500';

        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white shadow-lg ${color}`;
        toast.textContent = message;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2500);
    }

    getStoryIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || 'unknown';
    }

    getChapterFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('chapter') || '1';
    }

    previousChapter() {
        const currentChapter = parseInt(this.getChapterFromUrl(), 10);
        if (currentChapter > 1) {
            this.navigateToChapter(currentChapter - 1);
        }
    }

    nextChapter() {
        const currentChapter = parseInt(this.getChapterFromUrl(), 10);
        this.navigateToChapter(currentChapter + 1);
    }

    navigateToChapter(chapter) {
        const params = new URLSearchParams(window.location.search);
        params.set('chapter', String(chapter));
        window.location.search = params.toString();
    }

    throttle(callback, limitMs) {
        let inThrottle = false;

        return (...args) => {
            if (inThrottle) {
                return;
            }

            callback(...args);
            inThrottle = true;

            setTimeout(() => {
                inThrottle = false;
            }, limitMs);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TruyenStormApp();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TruyenStormApp;
}
