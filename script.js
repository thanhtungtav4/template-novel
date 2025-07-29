// MangaStorm Template JavaScript - Mobile Optimized

document.addEventListener('DOMContentLoaded', function() {
    console.log('MangaStorm template loaded successfully!');
    
    // Initialize all functionality
    initializeSearch();
    initializeMangaCards();
    initializeReadingHistory();
    initializeMobileMenu();
    initializeThemeToggle();
    initializeLazyLoading();
    initializeScrollBehavior();
});

// Enhanced mobile menu functionality
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileSearch = document.getElementById('mobile-search');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            const isOpen = !mobileMenu.classList.contains('hidden');
            
            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileMenuBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
                closeMobileMenu();
            }
        });
        
        // Close mobile menu on window resize if viewport becomes large
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 1024) { // lg breakpoint
                closeMobileMenu();
            }
        });
    }
    
    // Add mobile search toggle for very small screens
    if (window.innerWidth < 640) {
        addMobileSearchToggle();
    }
}

function openMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    
    mobileMenu.classList.remove('hidden');
    mobileMenuBtn.innerHTML = '<i class="fas fa-times text-xl"></i>';
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    
    mobileMenu.classList.add('hidden');
    mobileMenuBtn.innerHTML = '<i class="fas fa-bars text-xl"></i>';
    
    // Restore body scroll
    document.body.style.overflow = '';
}

function addMobileSearchToggle() {
    const header = document.querySelector('header .container .flex');
    const mobileSearch = document.getElementById('mobile-search');
    
    if (header && mobileSearch) {
        const searchToggle = document.createElement('button');
        searchToggle.innerHTML = '<i class="fas fa-search text-lg"></i>';
        searchToggle.className = 'sm:hidden p-2 rounded-md hover:bg-red-600 transition-colors';
        searchToggle.addEventListener('click', function() {
            mobileSearch.classList.toggle('hidden');
            if (!mobileSearch.classList.contains('hidden')) {
                const input = mobileSearch.querySelector('input');
                setTimeout(() => input.focus(), 100);
            }
        });
        
        // Insert before mobile menu button
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        mobileMenuBtn.parentNode.insertBefore(searchToggle, mobileMenuBtn);
    }
}
// Enhanced search functionality with mobile support
function initializeSearch() {
    const searchInputs = document.querySelectorAll('input[placeholder="Search..."]');
    const searchButtons = document.querySelectorAll('.fa-search');
    
    searchInputs.forEach((searchInput, index) => {
        const searchButton = searchButtons[index]?.parentElement;
        
        if (searchInput && searchButton) {
            // Search on Enter key
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch(searchInput.value);
                }
            });
            
            // Search on button click
            searchButton.addEventListener('click', function() {
                performSearch(searchInput.value);
            });
            
            // Auto-suggest functionality with debouncing
            let searchTimeout;
            searchInput.addEventListener('input', function() {
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
            searchInput.addEventListener('focus', function() {
                this.parentElement.classList.add('ring-2', 'ring-accent');
            });
            
            searchInput.addEventListener('blur', function() {
                this.parentElement.classList.remove('ring-2', 'ring-accent');
                // Hide suggestions after a delay to allow click
                setTimeout(hideSearchSuggestions, 200);
            });
        }
    });
}

// Scroll behavior for mobile optimization
function initializeScrollBehavior() {
    let lastScrollTop = 0;
    const header = document.querySelector('header');
    
    // Hide header on scroll down, show on scroll up (mobile)
    if (window.innerWidth <= 768) {
        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                // Scrolling down
                header.style.transform = 'translateY(-100%)';
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
    const mangaCards = document.querySelectorAll('.manga-card, [class*="hover:shadow"]');
    
    mangaCards.forEach(card => {
        // Add fade-in animation
        card.classList.add('fade-in-up');
        
        // Enhanced click/touch handler
        card.addEventListener('click', function(e) {
            e.preventDefault();
            const mangaTitle = this.querySelector('h4')?.textContent || 'Unknown Manga';
            console.log('Clicked on manga:', mangaTitle);
            
            // Add touch feedback
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
            
            showNotification(`Opening "${mangaTitle}"...`, 'success');
        });
        
        // Touch-friendly hover effects
        if ('ontouchstart' in window) {
            card.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            });
            
            card.addEventListener('touchend', function() {
                this.classList.remove('touch-active');
            });
        } else {
            // Mouse hover effects for desktop
            card.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-5px)';
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0)';
            });
        }
    });
}

// Reading history functionality
function initializeReadingHistory() {
    const historyItems = document.querySelectorAll('#reading-history .flex');
    
    historyItems.forEach(item => {
        item.addEventListener('click', function() {
            const mangaTitle = this.querySelector('span').textContent;
            const page = this.querySelector('.text-xs').textContent;
            console.log(`Continuing reading "${mangaTitle}" from ${page}`);
            showNotification(`Continuing "${mangaTitle}" from ${page}`, 'info');
        });
    });
}

// Mobile menu functionality
function initializeMobileMenu() {
    // Create mobile menu button if it doesn't exist
    const header = document.querySelector('header .container .flex');
    if (header && window.innerWidth <= 768) {
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        mobileMenuBtn.className = 'md:hidden text-white text-xl';
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        header.appendChild(mobileMenuBtn);
    }
}

function toggleMobileMenu() {
    const nav = document.querySelector('header nav');
    if (nav) {
        nav.classList.toggle('hidden');
        nav.classList.toggle('flex');
    }
}

// Theme toggle functionality
function initializeThemeToggle() {
    // Create theme toggle button
    const themeToggle = document.createElement('button');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.className = 'text-white hover:text-accent ml-4';
    themeToggle.addEventListener('click', toggleTheme);
    
    const headerRight = document.querySelector('header .flex .flex');
    if (headerRight) {
        headerRight.appendChild(themeToggle);
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    
    // Save theme preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Update toggle icon
    const toggleIcon = document.querySelector('.fa-moon, .fa-sun');
    if (toggleIcon) {
        toggleIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    showNotification(`Switched to ${isDark ? 'dark' : 'light'} mode`, 'info');
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

// Lazy loading for images
function initializeLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('skeleton');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            img.classList.add('skeleton');
            imageObserver.observe(img);
        });
    }
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg text-white transition-all duration-300 transform translate-x-full`;
    
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
            notification.classList.add('bg-blue-500');
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Smooth scrolling for anchor links
function initializeSmoothScrolling() {
    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Star rating functionality
function initializeStarRating() {
    const starRatings = document.querySelectorAll('.star-rating');
    
    starRatings.forEach(rating => {
        const stars = rating.querySelectorAll('i');
        
        stars.forEach((star, index) => {
            star.addEventListener('click', function() {
                const ratingValue = index + 1;
                console.log('Rated:', ratingValue);
                
                // Update star display
                stars.forEach((s, i) => {
                    if (i < ratingValue) {
                        s.className = 'fas fa-star';
                    } else {
                        s.className = 'far fa-star';
                    }
                });
                
                showNotification(`Rated ${ratingValue} stars`, 'success');
            });
        });
    });
}

// Initialize carousel functionality
function initializeCarousel() {
    const carouselButtons = document.querySelectorAll('[class*="bg-gray-300"]');
    
    carouselButtons.forEach(button => {
        button.addEventListener('click', function() {
            const isNext = this.textContent.includes('>');
            console.log(isNext ? 'Next slide' : 'Previous slide');
            // Here you would implement actual carousel logic
            showNotification(isNext ? 'Next page' : 'Previous page', 'info');
        });
    });
}

// Form validation
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            input.classList.add('border-red-500');
            showNotification(`${input.placeholder} is required`, 'error');
        } else {
            input.classList.remove('border-red-500');
        }
    });
    
    return isValid;
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Window resize handler
window.addEventListener('resize', throttle(() => {
    // Handle responsive changes
    if (window.innerWidth > 768) {
        // Desktop view
        const nav = document.querySelector('header nav');
        if (nav) {
            nav.classList.remove('hidden');
            nav.classList.add('flex');
        }
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
