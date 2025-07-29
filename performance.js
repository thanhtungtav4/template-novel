// Performance Monitor & Optimization Script
class PerformanceOptimizer {
    constructor() {
        this.metrics = {
            loadTime: 0,
            domReady: 0,
            firstPaint: 0,
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            memoryUsage: 0
        };
        
        this.init();
    }

    init() {
        this.measureLoadTime();
        this.optimizeImages();
        this.setupIntersectionObserver();
        this.monitorMemory();
        this.setupCriticalResourceHints();
        this.optimizeScrolling();
    }

    // Measure performance metrics
    measureLoadTime() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                const navigation = performance.getEntriesByType('navigation')[0];
                this.metrics.loadTime = navigation.loadEventEnd - navigation.fetchStart;
                this.metrics.domReady = navigation.domContentLoadedEventEnd - navigation.fetchStart;
                
                // Get paint metrics
                const paintEntries = performance.getEntriesByType('paint');
                paintEntries.forEach(entry => {
                    if (entry.name === 'first-paint') {
                        this.metrics.firstPaint = entry.startTime;
                    } else if (entry.name === 'first-contentful-paint') {
                        this.metrics.firstContentfulPaint = entry.startTime;
                    }
                });

                // Log performance metrics
                console.log('Performance Metrics:', this.metrics);
                this.displayMetrics();
            });
        }
    }

    // Optimize images with lazy loading and compression
    optimizeImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    
                    // Add loading placeholder
                    img.classList.add('lazy-placeholder');
                    
                    // Create optimized image
                    const optimizedImg = new Image();
                    optimizedImg.onload = () => {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-placeholder');
                        img.classList.add('fade-in-optimized');
                    };
                    optimizedImg.src = img.dataset.src;
                    
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '50px' });

        images.forEach(img => imageObserver.observe(img));
    }

    // Setup Intersection Observer for animations
    setupIntersectionObserver() {
        const animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-optimized');
                    entry.target.classList.add('optimized-transform');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            animationObserver.observe(el);
        });
    }

    // Monitor memory usage
    monitorMemory() {
        if ('memory' in performance) {
            const memoryInfo = () => {
                const memory = performance.memory;
                this.metrics.memoryUsage = {
                    used: Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100,
                    total: Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100,
                    limit: Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100
                };
                
                // Warn if memory usage is high
                if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
                    console.warn('High memory usage detected');
                    this.optimizeMemory();
                }
            };
            
            setInterval(memoryInfo, 30000); // Check every 30 seconds
            memoryInfo(); // Initial check
        }
    }

    // Setup critical resource hints
    setupCriticalResourceHints() {
        const head = document.head;
        
        // Preload critical CSS
        const criticalCSS = document.createElement('link');
        criticalCSS.rel = 'preload';
        criticalCSS.as = 'style';
        criticalCSS.href = 'advanced-styles.css';
        head.appendChild(criticalCSS);

        // Preconnect to external domains
        const preconnects = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://cdnjs.cloudflare.com',
            'https://picsum.photos'
        ];

        preconnects.forEach(domain => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = domain;
            head.appendChild(link);
        });
    }

    // Optimize scrolling performance
    optimizeScrolling() {
        let ticking = false;
        
        const updateScroll = () => {
            // Update scroll-based animations efficiently
            this.updateScrollAnimations();
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(updateScroll);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
    }

    updateScrollAnimations() {
        const scrollTop = window.pageYOffset;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollPercent = scrollTop / (documentHeight - windowHeight);

        // Update progress bars efficiently
        const progressBars = document.querySelectorAll('.reading-progress-bar');
        progressBars.forEach(bar => {
            bar.style.transform = `scaleX(${scrollPercent})`;
        });
    }

    // Clean up memory
    optimizeMemory() {
        // Remove unused event listeners
        this.cleanupEventListeners();
        
        // Clear unnecessary data
        if (window.gc) {
            window.gc(); // Force garbage collection in development
        }
        
        // Lazy load non-critical content
        this.lazyLoadNonCritical();
    }

    cleanupEventListeners() {
        // Remove old event listeners that are no longer needed
        const oldElements = document.querySelectorAll('.cleanup-needed');
        oldElements.forEach(el => {
            el.removeEventListener('click', this.oldClickHandler);
        });
    }

    lazyLoadNonCritical() {
        // Lazy load widgets, comments, etc.
        const nonCriticalSections = document.querySelectorAll('.lazy-section');
        const lazyObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadSection(entry.target);
                    lazyObserver.unobserve(entry.target);
                }
            });
        });

        nonCriticalSections.forEach(section => {
            lazyObserver.observe(section);
        });
    }

    loadSection(section) {
        // Load content dynamically
        const sectionType = section.dataset.section;
        switch (sectionType) {
            case 'comments':
                this.loadComments(section);
                break;
            case 'recommendations':
                this.loadRecommendations(section);
                break;
            case 'analytics':
                this.loadAnalytics(section);
                break;
        }
    }

    loadComments(section) {
        // Simulate loading comments
        setTimeout(() => {
            section.innerHTML = '<p>Comments loaded dynamically</p>';
        }, 100);
    }

    loadRecommendations(section) {
        // Simulate loading recommendations
        setTimeout(() => {
            section.innerHTML = '<p>Recommendations loaded dynamically</p>';
        }, 150);
    }

    loadAnalytics(section) {
        // Load analytics only when needed
        setTimeout(() => {
            section.innerHTML = '<p>Analytics loaded dynamically</p>';
        }, 200);
    }

    // Display performance metrics to admin
    displayMetrics() {
        if (window.location.search.includes('debug=true')) {
            const metricsDiv = document.createElement('div');
            metricsDiv.id = 'performance-metrics';
            metricsDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 9999;
                max-width: 300px;
            `;
            
            metricsDiv.innerHTML = `
                <strong>Performance Metrics</strong><br>
                Load Time: ${Math.round(this.metrics.loadTime)}ms<br>
                DOM Ready: ${Math.round(this.metrics.domReady)}ms<br>
                First Paint: ${Math.round(this.metrics.firstPaint)}ms<br>
                FCP: ${Math.round(this.metrics.firstContentfulPaint)}ms<br>
                Memory: ${this.metrics.memoryUsage?.used || 'N/A'}MB
            `;
            
            document.body.appendChild(metricsDiv);
        }
    }

    // Prefetch important pages
    prefetchPages() {
        const importantPages = [
            'story-list.html',
            'search.html',
            'genres.html'
        ];

        importantPages.forEach(page => {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = page;
            document.head.appendChild(link);
        });
    }

    // Optimize for Core Web Vitals
    optimizeCoreWebVitals() {
        // Reduce Cumulative Layout Shift
        this.preventLayoutShift();
        
        // Improve Largest Contentful Paint
        this.optimizeLCP();
        
        // Reduce First Input Delay
        this.optimizeFID();
    }

    preventLayoutShift() {
        // Add explicit dimensions to images
        const images = document.querySelectorAll('img:not([width]):not([height])');
        images.forEach(img => {
            img.style.aspectRatio = '16/9'; // Default aspect ratio
        });
    }

    optimizeLCP() {
        // Preload LCP image
        const heroImage = document.querySelector('.hero img, .cover-image img');
        if (heroImage) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = heroImage.src || heroImage.dataset.src;
            document.head.appendChild(link);
        }
    }

    optimizeFID() {
        // Break up long tasks
        this.scheduleWork();
    }

    scheduleWork() {
        const workQueue = [];
        
        const processWork = (deadline) => {
            while (deadline.timeRemaining() > 0 && workQueue.length > 0) {
                const work = workQueue.shift();
                work();
            }
            
            if (workQueue.length > 0) {
                requestIdleCallback(processWork);
            }
        };

        // Add non-critical work to queue
        workQueue.push(
            () => this.prefetchPages(),
            () => this.optimizeImages(),
            () => this.setupAnalytics()
        );

        requestIdleCallback(processWork);
    }

    setupAnalytics() {
        // Setup analytics only when idle
        console.log('Analytics setup completed during idle time');
    }
}

// Initialize performance optimizer
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new PerformanceOptimizer();
    });
} else {
    new PerformanceOptimizer();
}
