// MangaStorm Template JavaScript - Mobile Optimized

document.addEventListener('DOMContentLoaded', function () {
    console.log('MangaStorm template loaded successfully!');

    // Initialize all functionality
    initializeSearch();
    initializeMangaCards();
    initializeReadingHistory();
    initializeAdvancedFilters();
    initializeMobileMenu();
    initializeThemeToggle();
    // Native lazy loading is used in HTML, so custom initialization is not needed
    initializeScrollBehavior();
});

// Enhanced mobile menu functionality
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function () {
            const isOpen = !mobileMenu.classList.contains('hidden');

            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function (e) {
            if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                closeMobileMenu();
            }
        });

        // Close mobile menu on window resize if viewport becomes large
        window.addEventListener('resize', function () {
            if (window.innerWidth >= 1024) { // lg breakpoint
                closeMobileMenu();
            }
        });
    }
}

function openMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-button');

    if (mobileMenu && mobileMenuBtn) {
        mobileMenu.classList.remove('hidden');
        mobileMenuBtn.innerHTML = '<i class="fas fa-times text-xl"></i>';
        mobileMenuBtn.setAttribute('aria-expanded', 'true');

        // Prevent body scroll when menu is open
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-button');

    if (mobileMenu && mobileMenuBtn) {
        mobileMenu.classList.add('hidden');
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars text-xl"></i>';
        mobileMenuBtn.setAttribute('aria-expanded', 'false');

        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Enhanced search functionality with mobile support
function initializeSearch() {
    const searchInputs = document.querySelectorAll('input[type="search"]');
    const searchButtons = document.querySelectorAll('.fa-search');

    searchInputs.forEach((searchInput, index) => {
        // Find associated button (often sibling or parent's sibling)
        const searchButton = searchInput.parentElement.querySelector('button');

        if (searchInput) {
            // Search on Enter key
            searchInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    performSearch(searchInput.value);
                }
            });

            // Search on button click
            if (searchButton) {
                searchButton.addEventListener('click', function () {
                    performSearch(searchInput.value);
                });
            }

            // Auto-suggest functionality with debouncing
            let searchTimeout;
            searchInput.addEventListener('input', function () {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (this.value.length > 2) {
                        showSearchSuggestions(this.value);
                    } else {
                        hideSearchSuggestions();
                    }
                }, 300);
            });

            // Handle focus and blur for mobile
            searchInput.addEventListener('focus', function () {
                this.parentElement.classList.add('ring-2', 'ring-primary');
            });

            searchInput.addEventListener('blur', function () {
                this.parentElement.classList.remove('ring-2', 'ring-primary');
                // Hide suggestions after a delay to allow click
                setTimeout(hideSearchSuggestions, 200);
            });
        }
    });
}

function performSearch(query) {
    if (query && query.trim().length > 0) {
        console.log('Searching for:', query);
        // Redirect to search page
        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
}

function showSearchSuggestions(query) {
    // Placeholder for suggestion logic
    console.log('Show suggestions for:', query);
}

function hideSearchSuggestions() {
    // Placeholder for hiding suggestions
}

// Scroll behavior for mobile optimization
function initializeScrollBehavior() {
    let lastScrollTop = 0;
    const header = document.querySelector('header');

    // Hide header on scroll down, show on scroll up (mobile)
    if (header && window.innerWidth <= 768) {
        window.addEventListener('scroll', function () {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scrolling down
                header.style.transform = 'translateY(-100%)';
                header.style.transition = 'transform 0.3s ease-in-out';
            } else {
                // Scrolling up
                header.style.transform = 'translateY(0)';
            }

            lastScrollTop = scrollTop;
        }, { passive: true });
    }

    // Smooth scroll for anchor links
    initializeSmoothScrolling();
}

// Enhanced manga cards with touch support
function initializeMangaCards() {
    const mangaCards = document.querySelectorAll('.story-card');

    mangaCards.forEach(card => {
        // Enhanced click/touch handler
        const link = card.querySelector('a');
        if (link) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', function (e) {
                // Don't trigger if clicking specific interactive elements
                if (!e.target.closest('a') && !e.target.closest('button')) {
                    link.click();
                }
            });
        }

        // Touch-friendly hover effects
        if ('ontouchstart' in window) {
            card.addEventListener('touchstart', function () {
                this.classList.add('touch-active');
            });

            card.addEventListener('touchend', function () {
                this.classList.remove('touch-active');
            });
        } else {
            // Mouse hover effects for desktop
            card.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-5px)';
                this.style.transition = 'transform 0.3s ease';
            });

            card.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0)';
            });
        }
    });
}

// Reading history functionality
function initializeReadingHistory() {
    // 1. Handle saving history (would normally happen on reader.html)
    // For demo purposes, we'll just check if we're on the reader page (mock check)
    const isReaderPage = window.location.pathname.includes('reader.html');
    if (isReaderPage) {
        // Mock saving current story
        const currentStory = {
            id: 'story-' + Math.floor(Math.random() * 1000),
            title: document.title.split('-')[0].trim() || 'Truyện Đang Đọc',
            chapter: 'Chương ' + (Math.floor(Math.random() * 100) + 1),
            url: window.location.href,
            image: 'https://picsum.photos/80/120?random=' + Math.floor(Math.random() * 100),
            timestamp: Date.now()
        };
        saveReadingHistory(currentStory);
    }

    // 2. Handle displaying history (on index.html)
    const historySection = document.getElementById('reading-history-section');
    const historyList = document.getElementById('reading-history-list');
    const clearBtn = document.getElementById('clear-history-btn');

    if (historySection && historyList) {
        loadReadingHistory(historySection, historyList);

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử đọc truyện?')) {
                    localStorage.removeItem('readingHistory');
                    historySection.classList.add('hidden');
                    showNotification('Đã xóa lịch sử đọc truyện', 'success');
                }
            });
        }
    }
}

function saveReadingHistory(story) {
    let history = JSON.parse(localStorage.getItem('readingHistory') || '[]');

    // Remove existing entry for this story if exists
    history = history.filter(item => item.title !== story.title);

    // Add new entry to top
    history.unshift(story);

    // Limit to 6 items
    if (history.length > 6) {
        history = history.slice(0, 6);
    }

    localStorage.setItem('readingHistory', JSON.stringify(history));
}

function loadReadingHistory(section, list) {
    let history = JSON.parse(localStorage.getItem('readingHistory') || '[]');

    // MOCK DATA SEEDING (For demo if empty)
    if (history.length === 0) {
        history = [
            {
                title: 'Đại Quản Gia Là Ma Hoàng',
                chapter: 'Chương 256',
                url: 'story-detail.html',
                image: 'https://picsum.photos/80/120?random=1',
                timestamp: Date.now()
            },
            {
                title: 'Võ Luyện Đỉnh Phong',
                chapter: 'Chương 1024',
                url: 'story-detail.html',
                image: 'https://picsum.photos/80/120?random=2',
                timestamp: Date.now() - 10000
            },
            {
                title: 'Nguyên Tôn',
                chapter: 'Chương 50',
                url: 'story-detail.html',
                image: 'https://picsum.photos/80/120?random=3',
                timestamp: Date.now() - 20000
            }
        ];
        localStorage.setItem('readingHistory', JSON.stringify(history));
    }

    if (history.length > 0) {
        section.classList.remove('hidden');
        list.innerHTML = history.map(item => `
            <div class="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center space-x-3 hover:shadow-md transition-shadow">
                <img src="${item.image}" alt="${item.title}" class="w-12 h-16 object-cover rounded shadow-sm" loading="lazy">
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-gray-800 text-sm truncate">
                        <a href="${item.url}" class="hover:text-primary transition-colors">${item.title}</a>
                    </h3>
                    <div class="flex items-center justify-between mt-1">
                        <span class="text-xs text-gray-500 truncate">${item.chapter}</span>
                        <a href="${item.url}" class="text-xs text-primary font-medium hover:underline">Đọc tiếp</a>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        section.classList.add('hidden');
    }
}

// Theme toggle functionality
function initializeThemeToggle() {
    // Only add if not already present
    if (document.getElementById('theme-toggle-btn')) return;

    // Create theme toggle button
    const themeToggle = document.createElement('button');
    themeToggle.id = 'theme-toggle-btn';
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.className = 'text-gray-600 hover:text-primary ml-4 transition-colors';
    themeToggle.setAttribute('aria-label', 'Chuyển đổi chế độ sáng/tối');
    themeToggle.addEventListener('click', toggleTheme);

    // Append to the right-side actions container
    const headerRight = document.querySelector('header .flex.items-center.space-x-4');
    if (headerRight) {
        // Insert before the mobile menu button
        const mobileMenuBtn = document.getElementById('mobile-menu-button');
        if (mobileMenuBtn) {
            headerRight.insertBefore(themeToggle, mobileMenuBtn);
        } else {
            headerRight.appendChild(themeToggle);
        }
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');

    // Save theme preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Update toggle icon
    const toggleBtns = document.querySelectorAll('#theme-toggle-btn i, .fa-moon, .fa-sun');
    toggleBtns.forEach(icon => {
        if (icon.parentElement.id === 'theme-toggle-btn') {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
    });

    showNotification(`Đã chuyển sang chế độ ${isDark ? 'tối' : 'sáng'}`, 'info');
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        // Update icon if it exists immediately
        const toggleBtn = document.querySelector('#theme-toggle-btn i');
        if (toggleBtn) {
            toggleBtn.className = 'fas fa-sun';
        }
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-lg text-white transition-all duration-300 transform translate-x-full shadow-lg`;

    // Set color based on type
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500');
            break;
        case 'error':
            notification.classList.add('bg-red-500');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-500');
            break;
        default:
            notification.classList.add('bg-primary');
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.classList.remove('translate-x-full');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Smooth scrolling for anchor links
function initializeSmoothScrolling() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Window resize handler
function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

window.addEventListener('resize', throttle(() => {
    // Handle responsive changes
    if (window.innerWidth > 1024) {
        // Desktop view
        const nav = document.querySelector('header nav');
        if (nav) {
            nav.classList.remove('hidden');
            nav.classList.add('flex');
        }

        // Ensure mobile menu button is reset if needed
        const mobileMenuBtn = document.getElementById('mobile-menu-button');
        if (mobileMenuBtn) {
            mobileMenuBtn.innerHTML = '<i class="fas fa-bars text-xl"></i>';
            mobileMenuBtn.setAttribute('aria-expanded', 'false');
        }

        const mobileMenu = document.getElementById('mobile-menu');
        if (mobileMenu) {
            mobileMenu.classList.add('hidden');
        }
        document.body.style.overflow = '';
    }
}, 250));

// Initialize theme on load
loadTheme();

// Service Worker registration (for PWA functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Advanced Filters functionality
function initializeAdvancedFilters() {
    const filterSidebar = document.getElementById('filter-sidebar');
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const closeFilterSidebar = document.getElementById('close-filter-sidebar');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const storyGrid = document.getElementById('story-grid');
    const storyCount = document.getElementById('story-count');

    // Only proceed if elements exist (we are on story-list.html)
    if (!filterSidebar || !storyGrid) return;

    // Mobile Sidebar Toggle
    if (mobileFilterToggle) {
        mobileFilterToggle.addEventListener('click', () => {
            filterSidebar.classList.remove('hidden');
            filterSidebar.classList.add('fixed', 'inset-0', 'z-50', 'bg-gray-800', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'p-4');
            filterSidebar.querySelector('div').classList.add('w-full', 'max-w-md', 'max-h-[90vh]', 'overflow-y-auto');
        });
    }

    if (closeFilterSidebar) {
        closeFilterSidebar.addEventListener('click', () => {
            filterSidebar.classList.add('hidden');
            filterSidebar.classList.remove('fixed', 'inset-0', 'z-50', 'bg-gray-800', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'p-4');
            filterSidebar.querySelector('div').classList.remove('w-full', 'max-w-md', 'max-h-[90vh]', 'overflow-y-auto');
        });
    }

    // Filter Logic
    function filterStories() {
        const status = document.querySelector('input[name="status"]:checked').value;
        const minChapter = parseInt(document.getElementById('min-chapter').value) || 0;
        const maxChapter = parseInt(document.getElementById('max-chapter').value) || Infinity;

        const selectedGenres = Array.from(document.querySelectorAll('.genre-checkbox:checked')).map(cb => cb.value);

        const cards = storyGrid.querySelectorAll('.story-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const cardStatus = card.dataset.status;
            const cardChapters = parseInt(card.dataset.chapters);
            const cardGenres = card.dataset.genres.split(',');

            let isVisible = true;

            // Status Filter
            if (status !== 'all' && status !== cardStatus) {
                isVisible = false;
            }

            // Chapter Filter
            if (cardChapters < minChapter || cardChapters > maxChapter) {
                isVisible = false;
            }

            // Genre Filter (AND logic - must match all selected)
            if (selectedGenres.length > 0) {
                const hasAllGenres = selectedGenres.every(genre => cardGenres.includes(genre));
                if (!hasAllGenres) {
                    isVisible = false;
                }
            }

            if (isVisible) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });

        // Update Count
        if (storyCount) {
            storyCount.textContent = visibleCount;
        }

        // Close sidebar on mobile after applying
        if (window.innerWidth < 1024) {
            if (closeFilterSidebar) closeFilterSidebar.click();
        }
    }

    // Apply Button
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', filterStories);
    }

    // Reset Button
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // Reset inputs
            document.querySelector('input[name="status"][value="all"]').checked = true;
            document.getElementById('min-chapter').value = '';
            document.getElementById('max-chapter').value = '';
            document.querySelectorAll('.genre-checkbox').forEach(cb => cb.checked = false);

            // Re-filter (show all)
            filterStories();
        });
    }
}
