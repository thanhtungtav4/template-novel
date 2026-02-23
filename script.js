// Shared UI logic for TruyenStorm templates

const STORAGE_KEYS = {
    readingHistory: 'readingHistory',
    theme: 'ts-theme'
};

const FALLBACK_SEARCH_TERMS = [
    'Ngạo Thế',
    'Đấu Phá',
    'Hoàn Mỹ',
    'Tu Tiên',
    'Kiếm Hiệp',
    'Ngôn Tình'
];

document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeMobileMenu();
    initializeSearch();
    initializeSmoothScrolling();
    initializePlaceholderLinks();
    initializeBackToTop();
    initializeStoryCards();
    initializeRankingTabs();
    initializeReadingHistory();
    initializeAdvancedFilters();
    initializeCounters();
    initializeScrollBehavior();
    registerServiceWorker();
});

function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (!mobileMenuBtn || !mobileMenu) {
        return;
    }

    const setMenuState = (open) => {
        mobileMenu.classList.toggle('hidden', !open);
        mobileMenuBtn.setAttribute('aria-expanded', String(open));
        mobileMenu.setAttribute('aria-hidden', String(!open));
        mobileMenuBtn.innerHTML = open
            ? '<i class="fas fa-times text-xl"></i>'
            : '<i class="fas fa-bars text-xl"></i>';

        // Keep body scroll lock only for mobile menu on small viewports.
        document.body.style.overflow = open && window.innerWidth < 1024 ? 'hidden' : '';
    };

    setMenuState(false);

    mobileMenuBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        setMenuState(!isOpen);
    });

    mobileMenu.addEventListener('click', (event) => {
        const targetLink = event.target.closest('a');
        if (targetLink) {
            setMenuState(false);
        }
    });

    document.addEventListener('click', (event) => {
        const isOpen = mobileMenuBtn.getAttribute('aria-expanded') === 'true';
        if (!isOpen) {
            return;
        }

        if (!mobileMenuBtn.contains(event.target) && !mobileMenu.contains(event.target)) {
            setMenuState(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setMenuState(false);
        }
    });

    window.addEventListener('resize', throttle(() => {
        if (window.innerWidth >= 1024) {
            setMenuState(false);
        }
    }, 150));
}

function initializeSearch() {
    const searchInputs = document.querySelectorAll('input[type="search"]');
    if (searchInputs.length === 0) {
        return;
    }

    const allTerms = collectSearchTerms();

    searchInputs.forEach((input) => {
        const searchButton = input.parentElement ? input.parentElement.querySelector('button') : null;
        const suggestions = ensureSuggestionContainer(input);

        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                performSearch(input.value);
            }
        });

        if (searchButton) {
            searchButton.addEventListener('click', () => {
                performSearch(input.value);
            });
        }

        let searchTimeout;
        input.addEventListener('input', (event) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderSearchSuggestions(event.target.value, suggestions, allTerms);
            }, 180);
        });

        input.addEventListener('focus', () => {
            if (input.parentElement) {
                input.parentElement.classList.add('ring-2', 'ring-blue-300');
            }
            renderSearchSuggestions(input.value, suggestions, allTerms);
        });

        input.addEventListener('blur', () => {
            if (input.parentElement) {
                input.parentElement.classList.remove('ring-2', 'ring-blue-300');
            }
            setTimeout(() => {
                suggestions.classList.add('hidden');
            }, 140);
        });
    });
}

function collectSearchTerms() {
    const terms = new Set(FALLBACK_SEARCH_TERMS);

    document.querySelectorAll('.trending-keyword').forEach((el) => {
        const text = (el.textContent || '').trim();
        if (text) {
            terms.add(text);
        }
    });

    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.readingHistory) || '[]');
    history.forEach((item) => {
        if (item && item.title) {
            terms.add(item.title);
        }
    });

    return Array.from(terms);
}

function ensureSuggestionContainer(input) {
    if (input.parentElement && input.parentElement.querySelector('.search-suggestions')) {
        return input.parentElement.querySelector('.search-suggestions');
    }

    const suggestions = document.createElement('div');
    suggestions.className = 'search-suggestions hidden';
    suggestions.setAttribute('role', 'listbox');

    if (input.parentElement) {
        input.parentElement.classList.add('relative');
        input.parentElement.appendChild(suggestions);
    }

    return suggestions;
}

function renderSearchSuggestions(query, container, allTerms) {
    const normalizedQuery = (query || '').trim().toLowerCase();

    if (!normalizedQuery || normalizedQuery.length < 2) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    const matches = allTerms
        .filter((term) => term.toLowerCase().includes(normalizedQuery))
        .slice(0, 6);

    if (matches.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.innerHTML = matches.map((term) => (
        `<button type="button" class="search-suggestion-item" data-term="${escapeHtml(term)}">${escapeHtml(term)}</button>`
    )).join('');

    container.classList.remove('hidden');

    container.querySelectorAll('.search-suggestion-item').forEach((button) => {
        button.addEventListener('mousedown', (event) => {
            event.preventDefault();
            performSearch(button.dataset.term || '');
        });
    });
}

function performSearch(query) {
    const normalized = (query || '').trim();
    if (!normalized) {
        return;
    }

    window.location.href = `search.html?q=${encodeURIComponent(normalized)}`;
}

function initializeScrollBehavior() {
    const header = document.querySelector('header');
    if (!header) {
        return;
    }

    let lastScrollTop = window.scrollY;

    window.addEventListener('scroll', throttle(() => {
        if (window.innerWidth > 768) {
            header.style.transform = '';
            return;
        }

        const current = window.scrollY;
        const delta = current - lastScrollTop;

        if (current > 100 && delta > 8) {
            header.style.transform = 'translateY(-100%)';
            header.style.transition = 'transform 0.25s ease';
        } else if (delta < -8) {
            header.style.transform = 'translateY(0)';
        }

        lastScrollTop = current;
    }, 100), { passive: true });
}

function initializeStoryCards() {
    const storyCards = document.querySelectorAll('.story-card');

    storyCards.forEach((card) => {
        if ('ontouchstart' in window) {
            card.addEventListener('touchstart', () => {
                card.classList.add('touch-active');
            }, { passive: true });

            card.addEventListener('touchend', () => {
                card.classList.remove('touch-active');
            });
        }
    });
}

function initializeRankingTabs() {
    const tablists = document.querySelectorAll('.rank-tabs[role="tablist"]');
    if (tablists.length === 0) {
        return;
    }

    const activateTab = (tab, focusTarget = false) => {
        const tablist = tab.closest('[role="tablist"]');
        if (!tablist) {
            return;
        }

        const tabs = Array.from(tablist.querySelectorAll('.rank-tab[role="tab"]'));
        const container = tablist.parentElement;
        if (!container || tabs.length === 0) {
            return;
        }

        tabs.forEach((candidate) => {
            const isActive = candidate === tab;
            candidate.classList.toggle('is-active', isActive);
            candidate.setAttribute('aria-selected', String(isActive));
            candidate.tabIndex = isActive ? 0 : -1;
        });

        const activePanelId = tab.getAttribute('aria-controls');
        container.querySelectorAll('.rank-panel[role="tabpanel"]').forEach((panel) => {
            panel.classList.toggle('hidden', panel.id !== activePanelId);
        });

        if (focusTarget) {
            tab.focus();
        }
    };

    tablists.forEach((tablist) => {
        const tabs = Array.from(tablist.querySelectorAll('.rank-tab[role="tab"]'));
        tabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                activateTab(tab);
            });

            tab.addEventListener('keydown', (event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
                    return;
                }

                event.preventDefault();
                const direction = event.key === 'ArrowRight' ? 1 : -1;
                const nextIndex = (index + direction + tabs.length) % tabs.length;
                activateTab(tabs[nextIndex], true);
            });
        });

        const activeTab = tablist.querySelector('.rank-tab.is-active') || tabs[0];
        if (activeTab) {
            activateTab(activeTab);
        }
    });
}

function initializeReadingHistory() {
    const isReaderPage = window.location.pathname.includes('reader.html');
    if (isReaderPage) {
        const currentStory = {
            id: getStoryIdFromUrl(),
            title: document.title.split('-')[0].trim() || 'Truyện đang đọc',
            chapter: `Chương ${new URLSearchParams(window.location.search).get('chapter') || '1'}`,
            url: window.location.href,
            image: 'https://picsum.photos/80/120?random=' + Math.floor(Math.random() * 500),
            timestamp: Date.now()
        };
        saveReadingHistory(currentStory);
    }

    const historySection = document.getElementById('reading-history-section');
    const historyList = document.getElementById('reading-history-list');
    const clearBtn = document.getElementById('clear-history-btn');

    if (!historySection || !historyList) {
        return;
    }

    loadReadingHistory(historySection, historyList);

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn xóa toàn bộ lịch sử đọc truyện?')) {
                localStorage.removeItem(STORAGE_KEYS.readingHistory);
                historySection.classList.add('hidden');
                historyList.innerHTML = '';
                showNotification('Đã xóa lịch sử đọc truyện', 'success');
            }
        });
    }
}

function saveReadingHistory(story) {
    if (!story || !story.title) {
        return;
    }

    let history = JSON.parse(localStorage.getItem(STORAGE_KEYS.readingHistory) || '[]');
    history = history.filter((item) => item.title !== story.title);
    history.unshift(story);

    if (history.length > 6) {
        history = history.slice(0, 6);
    }

    localStorage.setItem(STORAGE_KEYS.readingHistory, JSON.stringify(history));
}

function loadReadingHistory(section, list) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.readingHistory) || '[]');

    if (history.length === 0) {
        section.classList.add('hidden');
        list.innerHTML = '';
        return;
    }

    section.classList.remove('hidden');
    list.innerHTML = history.map((item) => `
        <div class="bg-white rounded-lg p-3 shadow-sm border border-gray-100 flex items-center space-x-3 hover:shadow-md transition-shadow">
            <img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.title)}" class="w-12 h-16 object-cover rounded shadow-sm" loading="lazy">
            <div class="flex-1 min-w-0">
                <h3 class="font-bold text-gray-800 text-sm truncate">
                    <a href="${escapeHtml(item.url || 'story-detail.html')}" class="hover:text-primary transition-colors">${escapeHtml(item.title)}</a>
                </h3>
                <div class="flex items-center justify-between mt-1">
                    <span class="text-xs text-gray-500 truncate">${escapeHtml(item.chapter || '')}</span>
                    <a href="${escapeHtml(item.url || 'story-detail.html')}" class="text-xs text-primary font-medium hover:underline">Đọc tiếp</a>
                </div>
            </div>
        </div>
    `).join('');
}

function initializeTheme() {
    const toggles = document.querySelectorAll('#theme-toggle, #theme-toggle-btn');
    const preferredTheme = getPreferredTheme();
    applyTheme(preferredTheme, false);

    if (toggles.length === 0) {
        return;
    }

    toggles.forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme, true);
        });
    });
}

function getPreferredTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme, announce) {
    const isDark = theme === 'dark';

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem(STORAGE_KEYS.theme, isDark ? 'dark' : 'light');

    document.querySelectorAll('#theme-toggle i, #theme-toggle-btn i').forEach((icon) => {
        icon.className = isDark ? 'fas fa-sun text-gray-100' : 'fas fa-moon text-gray-600';
    });

    if (announce) {
        showNotification(`Đã chuyển sang chế độ ${isDark ? 'tối' : 'sáng'}`, 'info');
    }
}

function initializeSmoothScrolling() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach((anchor) => {
        anchor.addEventListener('click', function (event) {
            const href = this.getAttribute('href') || '';
            if (href === '#' || href.length < 2) {
                return;
            }

            const target = document.querySelector(href);
            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    });
}

function initializePlaceholderLinks() {
    let lastNoticeAt = 0;

    document.querySelectorAll('a[href="#"]').forEach((link) => {
        link.classList.add('link-disabled');
        link.setAttribute('aria-disabled', 'true');

        link.addEventListener('click', (event) => {
            event.preventDefault();
            const now = Date.now();
            if (now - lastNoticeAt > 1500) {
                showNotification('Mục này đang được cập nhật.', 'info');
                lastNoticeAt = now;
            }
        });
    });
}

function initializeBackToTop() {
    if (document.getElementById('back-to-top')) {
        return;
    }

    const button = document.createElement('button');
    button.id = 'back-to-top';
    button.type = 'button';
    button.className = 'back-to-top';
    button.setAttribute('aria-label', 'Quay lên đầu trang');
    button.innerHTML = '<i class="fas fa-arrow-up"></i>';

    button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.body.appendChild(button);

    window.addEventListener('scroll', throttle(() => {
        button.classList.toggle('is-visible', window.scrollY > 500);
    }, 120), { passive: true });
}

function initializeCounters() {
    const counters = document.querySelectorAll('.counter[data-target]');
    if (counters.length === 0) {
        return;
    }

    const animate = (counter) => {
        const target = Number(counter.getAttribute('data-target') || 0);
        if (!target || Number.isNaN(target)) {
            return;
        }

        let start = 0;
        const duration = 1200;
        const startedAt = performance.now();

        const tick = (now) => {
            const progress = Math.min((now - startedAt) / duration, 1);
            start = Math.floor(progress * target);
            counter.textContent = start.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                counter.textContent = target.toLocaleString();
            }
        };

        requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                animate(entry.target);
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.35 });

    counters.forEach((counter) => observer.observe(counter));
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 z-50 px-5 py-3 rounded-lg text-white shadow-lg transition-all duration-300 transform translate-x-full';
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');

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

    requestAnimationFrame(() => {
        notification.classList.remove('translate-x-full');
    });

    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            notification.remove();
        }, 260);
    }, 2600);
}

function initializeAdvancedFilters() {
    const filterSidebar = document.getElementById('filter-sidebar');
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const closeFilterSidebar = document.getElementById('close-filter-sidebar');
    const applyFiltersBtn = document.getElementById('apply-filters');
    const resetFiltersBtn = document.getElementById('reset-filters');
    const storyGrid = document.getElementById('story-grid');
    const storyCount = document.getElementById('story-count');

    if (!filterSidebar || !storyGrid) {
        return;
    }

    const overlayClasses = ['fixed', 'inset-0', 'z-50', 'bg-gray-800', 'bg-opacity-50', 'flex', 'items-center', 'justify-center', 'p-4'];

    const openFilterSidebar = () => {
        filterSidebar.classList.remove('hidden');
        filterSidebar.classList.add(...overlayClasses);

        const panel = filterSidebar.querySelector('div');
        if (panel) {
            panel.classList.add('w-full', 'max-w-md', 'max-h-[90vh]', 'overflow-y-auto');
        }
    };

    const closeSidebar = () => {
        filterSidebar.classList.add('hidden');
        filterSidebar.classList.remove(...overlayClasses);

        const panel = filterSidebar.querySelector('div');
        if (panel) {
            panel.classList.remove('w-full', 'max-w-md', 'max-h-[90vh]', 'overflow-y-auto');
        }
    };

    const filterStories = () => {
        const statusInput = document.querySelector('input[name="status"]:checked');
        const status = statusInput ? statusInput.value : 'all';
        const minChapter = parseInt(document.getElementById('min-chapter')?.value || '0', 10) || 0;
        const maxChapterRaw = parseInt(document.getElementById('max-chapter')?.value || '', 10);
        const maxChapter = Number.isNaN(maxChapterRaw) ? Infinity : maxChapterRaw;

        const selectedGenres = Array.from(document.querySelectorAll('.genre-checkbox:checked')).map((checkbox) => checkbox.value);

        let visibleCount = 0;
        const cards = storyGrid.querySelectorAll('.story-card');

        cards.forEach((card) => {
            const cardStatus = card.dataset.status;
            const cardChapters = parseInt(card.dataset.chapters || '0', 10);
            const cardGenres = (card.dataset.genres || '').split(',').map((genre) => genre.trim()).filter(Boolean);

            const statusMatch = status === 'all' || status === cardStatus;
            const chapterMatch = cardChapters >= minChapter && cardChapters <= maxChapter;
            const genreMatch = selectedGenres.length === 0 || selectedGenres.every((genre) => cardGenres.includes(genre));

            const isVisible = statusMatch && chapterMatch && genreMatch;
            card.classList.toggle('hidden', !isVisible);

            if (isVisible) {
                visibleCount += 1;
            }
        });

        if (storyCount) {
            storyCount.textContent = String(visibleCount);
        }

        if (window.innerWidth < 1024) {
            closeSidebar();
        }
    };

    if (mobileFilterToggle) {
        mobileFilterToggle.addEventListener('click', openFilterSidebar);
    }

    if (closeFilterSidebar) {
        closeFilterSidebar.addEventListener('click', closeSidebar);
    }

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', filterStories);
    }

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            const allStatus = document.querySelector('input[name="status"][value="all"]');
            if (allStatus) {
                allStatus.checked = true;
            }

            const minChapterInput = document.getElementById('min-chapter');
            const maxChapterInput = document.getElementById('max-chapter');
            if (minChapterInput) {
                minChapterInput.value = '';
            }
            if (maxChapterInput) {
                maxChapterInput.value = '';
            }

            document.querySelectorAll('.genre-checkbox').forEach((checkbox) => {
                checkbox.checked = false;
            });

            filterStories();
        });
    }
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || window.__tsSwRegistered) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                window.__tsSwRegistered = true;
                console.log('SW registered:', registration.scope);
            })
            .catch((error) => {
                console.log('SW registration failed:', error);
            });
    });
}

function getStoryIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 'story';
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function throttle(callback, limit) {
    let inThrottle = false;

    return function throttled(...args) {
        if (inThrottle) {
            return;
        }

        callback.apply(this, args);
        inThrottle = true;

        setTimeout(() => {
            inThrottle = false;
        }, limit);
    };
}
