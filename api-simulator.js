// API Simulation v1.0
class APISimulator {
    constructor() {
        this.stories = this.generateMockStories();
        this.users = this.generateMockUsers();
        this.analytics = this.generateMockAnalytics();
    }

    // Mock Data Generators
    generateMockStories() {
        const genres = ['Tiên Hiệp', 'Ngôn Tình', 'Kiếm Hiệp', 'Trinh Thám', 'Khoa Học Viễn Tưởng', 'Fantasy'];
        const statuses = ['Đang tiến hành', 'Hoàn thành', 'Tạm dừng'];
        const authors = ['Kim Dung', 'Thiên Tằm Thổ Đậu', 'Mạo Hiểm Nhà', 'Đang Doanh', 'Hoàng Dịch'];
        
        return Array.from({length: 100}, (_, i) => ({
            id: i + 1,
            title: `Truyện ${i + 1}`,
            author: authors[Math.floor(Math.random() * authors.length)],
            genre: genres[Math.floor(Math.random() * genres.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            views: Math.floor(Math.random() * 1000000) + 10000,
            rating: (Math.random() * 2 + 3).toFixed(1),
            chapters: Math.floor(Math.random() * 1000) + 50,
            lastUpdate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
            description: `Mô tả truyện ${i + 1}...`,
            cover: `https://picsum.photos/200/280?random=${i + 1}`,
            tags: ['hot', 'trending', 'completed'].slice(0, Math.floor(Math.random() * 3) + 1)
        }));
    }

    generateMockUsers() {
        return Array.from({length: 50}, (_, i) => ({
            id: i + 1,
            username: `user${i + 1}`,
            email: `user${i + 1}@example.com`,
            joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
            lastActive: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            storiesRead: Math.floor(Math.random() * 100) + 5,
            favoriteGenre: ['Tiên Hiệp', 'Ngôn Tình', 'Kiếm Hiệp'][Math.floor(Math.random() * 3)],
            readingTime: Math.floor(Math.random() * 500) + 50,
            subscription: ['free', 'premium', 'vip'][Math.floor(Math.random() * 3)]
        }));
    }

    generateMockAnalytics() {
        const dates = Array.from({length: 30}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        }).reverse();

        return {
            dailyViews: dates.map(date => ({
                date,
                views: Math.floor(Math.random() * 100000) + 50000,
                uniqueUsers: Math.floor(Math.random() * 20000) + 10000
            })),
            topGenres: [
                { name: 'Tiên Hiệp', percentage: 35 },
                { name: 'Ngôn Tình', percentage: 25 },
                { name: 'Kiếm Hiệp', percentage: 20 },
                { name: 'Trinh Thám', percentage: 12 },
                { name: 'Khác', percentage: 8 }
            ],
            deviceStats: [
                { device: 'Mobile', percentage: 65 },
                { device: 'Desktop', percentage: 25 },
                { device: 'Tablet', percentage: 10 }
            ]
        };
    }

    // API Endpoints
    async getStories(filters = {}) {
        return new Promise(resolve => {
            setTimeout(() => {
                let filteredStories = [...this.stories];

                if (filters.genre) {
                    filteredStories = filteredStories.filter(s => s.genre === filters.genre);
                }

                if (filters.status) {
                    filteredStories = filteredStories.filter(s => s.status === filters.status);
                }

                if (filters.search) {
                    filteredStories = filteredStories.filter(s => 
                        s.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                        s.author.toLowerCase().includes(filters.search.toLowerCase())
                    );
                }

                if (filters.sortBy === 'views') {
                    filteredStories.sort((a, b) => b.views - a.views);
                } else if (filters.sortBy === 'rating') {
                    filteredStories.sort((a, b) => b.rating - a.rating);
                } else if (filters.sortBy === 'updated') {
                    filteredStories.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate));
                }

                const page = filters.page || 1;
                const limit = filters.limit || 20;
                const start = (page - 1) * limit;
                const end = start + limit;

                resolve({
                    stories: filteredStories.slice(start, end),
                    total: filteredStories.length,
                    page,
                    totalPages: Math.ceil(filteredStories.length / limit)
                });
            }, 200);
        });
    }

    async getStoryById(id) {
        return new Promise(resolve => {
            setTimeout(() => {
                const story = this.stories.find(s => s.id === parseInt(id));
                if (story) {
                    resolve({
                        ...story,
                        chapters: Array.from({length: story.chapters}, (_, i) => ({
                            id: i + 1,
                            title: `Chương ${i + 1}`,
                            publishDate: new Date(Date.now() - (story.chapters - i) * 24 * 60 * 60 * 1000),
                            wordCount: Math.floor(Math.random() * 3000) + 1000
                        }))
                    });
                } else {
                    resolve(null);
                }
            }, 150);
        });
    }

    async getChapterContent(storyId, chapterNumber) {
        return new Promise(resolve => {
            setTimeout(() => {
                const story = this.stories.find(s => s.id === parseInt(storyId));
                if (story && chapterNumber <= story.chapters) {
                    resolve({
                        storyId: parseInt(storyId),
                        chapterNumber: parseInt(chapterNumber),
                        title: `Chương ${chapterNumber}`,
                        content: this.generateMockContent(),
                        wordCount: Math.floor(Math.random() * 3000) + 1000,
                        publishDate: new Date(),
                        nextChapter: chapterNumber < story.chapters ? chapterNumber + 1 : null,
                        prevChapter: chapterNumber > 1 ? chapterNumber - 1 : null
                    });
                } else {
                    resolve(null);
                }
            }, 100);
        });
    }

    generateMockContent() {
        const paragraphs = [
            "Trời cao mây trắng, gió nhẹ thổi qua những tán lá xanh mướt. Trong khu rừng yên tĩnh này, một bóng người đang ngồi thiền dưới gốc cây cổ thụ.",
            "Đột nhiên, một luồng khí mạnh mẽ bùng phát từ trong cơ thể anh ta, khiến những chiếc lá xung quanh bay tung tóe.",
            "Đôi mắt từ từ mở ra, ánh sáng lạ lùng tỏa ra từ đồng tử. Sau bao ngày khổ luyện, cuối cùng anh đã đột phá được rào cản.",
            "Đứng dậy, anh nhìn về phía chân trời xa xa, nơi có những đỉnh núi cao vút. Hành trình của anh vẫn còn dài, nhưng giờ đây anh đã có đủ sức mạnh để đối mặt với những thử thách phía trước.",
            "Bước chân nhẹ nhàng, anh bắt đầu cuộc hành trình mới. Gió thổi qua tóc anh, mang theo hương thơm của hoa dại và tiếng hót của chim muông.",
            "Đường đi có thể gian nan, nhưng tâm chí anh đã được tôi luyện qua bao năm tháng. Không có gì có thể ngăn cản anh trên con đường tu luyện này."
        ];

        return Array.from({length: 20}, () => 
            paragraphs[Math.floor(Math.random() * paragraphs.length)]
        ).join('\n\n');
    }

    async searchStories(query) {
        return new Promise(resolve => {
            setTimeout(() => {
                const results = this.stories.filter(story =>
                    story.title.toLowerCase().includes(query.toLowerCase()) ||
                    story.author.toLowerCase().includes(query.toLowerCase()) ||
                    story.genre.toLowerCase().includes(query.toLowerCase())
                ).slice(0, 10);

                resolve(results);
            }, 300);
        });
    }

    async getUsers(filters = {}) {
        return new Promise(resolve => {
            setTimeout(() => {
                let filteredUsers = [...this.users];

                if (filters.subscription) {
                    filteredUsers = filteredUsers.filter(u => u.subscription === filters.subscription);
                }

                const page = filters.page || 1;
                const limit = filters.limit || 20;
                const start = (page - 1) * limit;
                const end = start + limit;

                resolve({
                    users: filteredUsers.slice(start, end),
                    total: filteredUsers.length,
                    page,
                    totalPages: Math.ceil(filteredUsers.length / limit)
                });
            }, 200);
        });
    }

    async getAnalytics() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.analytics);
            }, 150);
        });
    }

    // Reading Progress API
    async saveReadingProgress(userId, storyId, chapterNumber, progress) {
        return new Promise(resolve => {
            setTimeout(() => {
                const key = `progress_${userId}_${storyId}`;
                const progressData = {
                    userId,
                    storyId,
                    chapterNumber,
                    progress,
                    timestamp: Date.now()
                };
                
                localStorage.setItem(key, JSON.stringify(progressData));
                resolve({ success: true });
            }, 100);
        });
    }

    async getReadingProgress(userId, storyId) {
        return new Promise(resolve => {
            setTimeout(() => {
                const key = `progress_${userId}_${storyId}`;
                const progress = localStorage.getItem(key);
                resolve(progress ? JSON.parse(progress) : null);
            }, 50);
        });
    }

    // Recommendation API
    async getRecommendations(userId) {
        return new Promise(resolve => {
            setTimeout(() => {
                const recommended = this.stories
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 6);
                resolve(recommended);
            }, 200);
        });
    }

    // Comments API
    async getComments(storyId, page = 1) {
        return new Promise(resolve => {
            setTimeout(() => {
                const comments = Array.from({length: 50}, (_, i) => ({
                    id: i + 1,
                    userId: Math.floor(Math.random() * 50) + 1,
                    username: `user${Math.floor(Math.random() * 50) + 1}`,
                    content: `Bình luận số ${i + 1} cho truyện. Truyện hay quá!`,
                    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                    likes: Math.floor(Math.random() * 20),
                    replies: []
                }));

                const limit = 10;
                const start = (page - 1) * limit;
                const end = start + limit;

                resolve({
                    comments: comments.slice(start, end),
                    total: comments.length,
                    page,
                    totalPages: Math.ceil(comments.length / limit)
                });
            }, 150);
        });
    }
}

// Global API instance
const API = new APISimulator();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APISimulator;
}
