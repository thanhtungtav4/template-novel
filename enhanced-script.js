// Lightweight visual enhancements with no behavioral overrides.

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function initializeRevealObserver() {
    if (prefersReducedMotion()) {
        return;
    }

    const observer = new IntersectionObserver((entries, instance) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('enhanced-visible');
                instance.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('section, .story-card, .glass').forEach((node) => {
        node.classList.add('enhanced-reveal');
        observer.observe(node);
    });
}

function animateTrendingKeywords() {
    if (prefersReducedMotion()) {
        return;
    }

    const keywords = document.querySelectorAll('.trending-keyword');
    keywords.forEach((keyword, index) => {
        keyword.style.transitionDelay = `${index * 50}ms`;
        keyword.classList.add('keyword-ready');
    });

    requestAnimationFrame(() => {
        keywords.forEach((keyword) => keyword.classList.add('keyword-visible'));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeRevealObserver();
    animateTrendingKeywords();
});

const style = document.createElement('style');
style.textContent = `
    .enhanced-reveal {
        opacity: 0;
        transform: translateY(12px);
    }

    .enhanced-visible {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.45s ease, transform 0.45s ease;
    }

    .keyword-ready {
        opacity: 0;
        transform: translateY(8px);
    }

    .keyword-visible {
        opacity: 1;
        transform: translateY(0);
        transition: opacity 0.35s ease, transform 0.35s ease;
    }
`;

document.head.appendChild(style);
