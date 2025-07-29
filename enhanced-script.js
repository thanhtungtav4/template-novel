// Enhanced JavaScript for better visual appeal

// Statistics Counter Animation (Fixed)
function animateCounters() {
    const counters = document.querySelectorAll('[id$="-count"]');
    
    counters.forEach(counter => {
        const originalText = counter.textContent;
        const textWithoutNumbers = originalText.replace(/[\d,+]/g, '');
        
        // Extract target number and handle special cases
        let targetText = originalText;
        let targetNumber = 0;
        
        if (originalText.includes('50,000+')) {
            targetNumber = 50000;
            targetText = '50,000+';
        } else if (originalText.includes('1M+')) {
            targetNumber = 1000000;
            targetText = '1M+';
        } else if (originalText.includes('5M+')) {
            targetNumber = 5000000;
            targetText = '5M+';
        } else {
            return; // Skip if no recognizable pattern
        }
        
        let current = 0;
        const increment = targetNumber / 80; // Slower animation
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= targetNumber) {
                counter.textContent = targetText;
                clearInterval(timer);
            } else {
                if (targetText.includes('M+')) {
                    const millions = (current / 1000000).toFixed(1);
                    counter.textContent = millions + 'M+';
                } else if (targetText.includes('K+') || targetText.includes(',000+')) {
                    const thousands = Math.floor(current / 1000);
                    counter.textContent = thousands.toLocaleString() + '+';
                } else {
                    counter.textContent = Math.floor(current).toLocaleString() + '+';
                }
            }
        }, 30);
    });
}

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-slide-in');
        }
    });
}, observerOptions);

// Featured Stories Carousel
function initializeCarousel() {
    const featuredGrid = document.querySelector('.featured-grid');
    if (!featuredGrid) return;

    const stories = featuredGrid.children;
    if (!stories || stories.length === 0) return;
    
    let currentIndex = 0;
    const totalStories = stories.length;

    // Auto-rotate featured stories
    setInterval(() => {
        try {
            if (stories[currentIndex]) {
                stories[currentIndex].style.transform = 'scale(0.95)';
            }
            currentIndex = (currentIndex + 1) % totalStories;
            if (stories[currentIndex]) {
                stories[currentIndex].style.transform = 'scale(1.05)';
                
                setTimeout(() => {
                    if (stories[currentIndex]) {
                        stories[currentIndex].style.transform = 'scale(1)';
                    }
                }, 300);
            }
        } catch(e) {
            console.log('Carousel animation error:', e);
        }
    }, 3000);
}

// Trending Keywords Animation
function animateTrendingKeywords() {
    const keywords = document.querySelectorAll('.trending-keyword');
    if (!keywords || keywords.length === 0) return;
    
    keywords.forEach((keyword, index) => {
        try {
            setTimeout(() => {
                if (keyword) {
                    keyword.style.opacity = '1';
                    keyword.style.transform = 'translateY(0)';
                }
            }, index * 100);
        } catch(e) {
            console.log('Trending keyword animation error:', e);
        }
    });
}

// Reading Progress for stories
function addReadingProgress() {
    const storyCards = document.querySelectorAll('.story-card');
    if (!storyCards || storyCards.length === 0) return;
    
    storyCards.forEach(card => {
        try {
            const progress = Math.floor(Math.random() * 100);
            const progressBar = document.createElement('div');
            progressBar.className = 'absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-blue-600 transition-all duration-300';
            progressBar.style.width = progress + '%';
            
            const cardContainer = card.querySelector('.relative');
            if (cardContainer) {
                cardContainer.appendChild(progressBar);
            }
        } catch(e) {
            console.log('Reading progress error for card:', e);
        }
    });
}

// Hot Badge Animation
function animateHotBadges() {
    const hotBadges = document.querySelectorAll('.badge-hot');
    if (!hotBadges || hotBadges.length === 0) return;
    
    hotBadges.forEach(badge => {
        try {
            setInterval(() => {
                if (badge) {
                    badge.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        if (badge) {
                            badge.style.transform = 'scale(1)';
                        }
                    }, 200);
                }
            }, 2000 + Math.random() * 1000);
        } catch(e) {
            console.log('Hot badge animation error:', e);
        }
    });
}

// Search Enhancement
function enhanceSearch() {
    const searchInputs = document.querySelectorAll('input[type="search"]');
    if (!searchInputs || searchInputs.length === 0) return;
    
    searchInputs.forEach(input => {
        try {
            input.addEventListener('focus', () => {
                if (input.parentElement) {
                    input.parentElement.classList.add('ring-4', 'ring-blue-300');
                }
            });
            
            input.addEventListener('blur', () => {
                if (input.parentElement) {
                    input.parentElement.classList.remove('ring-4', 'ring-blue-300');
                }
            });
        } catch(e) {
            console.log('Search enhancement error for input:', e);
        }
    });
}

// View Count Animation (Fixed)
function animateViewCounts() {
    const viewCounts = document.querySelectorAll('.view-count');
    
    viewCounts.forEach(count => {
        const originalText = count.textContent;
        // Extract number from text like "🔥 1,248,539" or "1,248,539"
        const numberMatch = originalText.match(/([\d,]+)/);
        if (!numberMatch) return;
        
        const originalNumber = parseInt(numberMatch[1].replace(/,/g, ''));
        if (isNaN(originalNumber)) return;
        
        const randomIncrement = Math.floor(Math.random() * 10) + 1;
        
        setInterval(() => {
            const currentMatch = count.textContent.match(/([\d,]+)/);
            if (!currentMatch) return;
            
            const currentValue = parseInt(currentMatch[1].replace(/,/g, ''));
            if (isNaN(currentValue)) return;
            
            const newValue = currentValue + randomIncrement;
            count.textContent = count.textContent.replace(/([\d,]+)/, newValue.toLocaleString());
        }, 15000 + Math.random() * 10000); // Slower updates
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Existing mobile menu functionality
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => {
                const isHidden = mobileMenu.classList.contains('hidden');
                if (isHidden) {
                    mobileMenu.classList.remove('hidden');
                    mobileMenuButton.setAttribute('aria-expanded', 'true');
                } else {
                    mobileMenu.classList.add('hidden');
                    mobileMenuButton.setAttribute('aria-expanded', 'false');
                }
            });
        }
        
        // New enhancements with error handling
        setTimeout(() => {
            try { animateCounters(); } catch(e) { console.log('Counter animation error:', e); }
        }, 500);
        
        try { initializeCarousel(); } catch(e) { console.log('Carousel error:', e); }
        try { animateTrendingKeywords(); } catch(e) { console.log('Trending keywords error:', e); }
        try { addReadingProgress(); } catch(e) { console.log('Reading progress error:', e); }
        try { animateHotBadges(); } catch(e) { console.log('Hot badges error:', e); }
        try { enhanceSearch(); } catch(e) { console.log('Search enhancement error:', e); }
        try { animateViewCounts(); } catch(e) { console.log('View counts error:', e); }
        
        // Observe elements for animations
        try {
            document.querySelectorAll('section').forEach(section => {
                observer.observe(section);
            });
        } catch(e) { 
            console.log('Observer error:', e); 
        }
    } catch(e) {
        console.log('Main initialization error:', e);
    }
});

// Add CSS animations via JavaScript
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-30px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
    
    .animate-fade-in-up {
        animation: fadeInUp 0.8s ease-out;
    }
    
    .animate-slide-in {
        animation: slideIn 0.6s ease-out;
    }
    
    .trending-keyword {
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
    }
    
    .story-card:hover .reading-progress {
        height: 3px;
    }
    
    .badge-hot {
        animation: pulse 2s infinite;
    }
    
    .backdrop-blur-sm {
        backdrop-filter: blur(4px);
    }
`;

document.head.appendChild(style);
