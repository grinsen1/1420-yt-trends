// YouTube Trends Dashboard - Main Application
class YouTubeTrendsDashboard {
    constructor() {
        this.videos = [];
        this.aiCache = new Map();
        this.isLoading = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Form elements
        this.youtubeApiKeyInput = document.getElementById('youtube-api-key');
        this.openrouterKeyInput = document.getElementById('openrouter-key');
        this.aiModelSelect = document.getElementById('ai-model');
        
        // Buttons
        this.loadVideosBtn = document.getElementById('load-videos-btn');
        this.analyzeAllBtn = document.getElementById('analyze-all-btn');
        
        // Status elements
        this.youtubeApiStatus = document.getElementById('youtube-api-status');
        this.openrouterApiStatus = document.getElementById('openrouter-api-status');
        this.errorContainer = document.getElementById('error-container');
        
        // Sections
        this.videosSection = document.getElementById('videos-section');
        this.videosGrid = document.getElementById('videos-grid');
        this.loadingSpinner = document.getElementById('loading-spinner');
        
        // Progress
        this.progressContainer = document.getElementById('mass-analysis-progress');
        this.progressFill = document.getElementById('progress-fill');
        this.progressText = document.getElementById('progress-text');
        
        // Modals
        this.methodologyModal = document.getElementById('methodology-modal');
        this.apiCheckModal = document.getElementById('api-check-modal');
        this.aiResultsModal = document.getElementById('ai-results-modal');
    }

    bindEvents() {
        // Main actions
        this.loadVideosBtn.addEventListener('click', () => this.loadYouTubeVideos());
        this.analyzeAllBtn.addEventListener('click', () => this.massAnalyzeVideos());
        
        // Links
        document.getElementById('methodology-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showModal('methodology');
        });
        
        document.getElementById('check-api-link').addEventListener('click', (e) => {
            e.preventDefault();
            this.showApiCheck();
        });
        
        // Modal events
        this.bindModalEvents();
        
        // API key validation
        this.youtubeApiKeyInput.addEventListener('input', () => this.validateApiKey('youtube'));
        this.openrouterKeyInput.addEventListener('input', () => this.validateApiKey('openrouter'));
    }

    bindModalEvents() {
        // Methodology modal
        document.getElementById('methodology-close').addEventListener('click', () => this.hideModal('methodology'));
        document.getElementById('methodology-overlay').addEventListener('click', () => this.hideModal('methodology'));
        
        // API check modal
        document.getElementById('api-check-close').addEventListener('click', () => this.hideModal('api-check'));
        document.getElementById('api-check-overlay').addEventListener('click', () => this.hideModal('api-check'));
        
        // AI results modal
        document.getElementById('ai-results-close').addEventListener('click', () => this.hideModal('ai-results'));
        document.getElementById('ai-results-overlay').addEventListener('click', () => this.hideModal('ai-results'));
    }

    showModal(type) {
        const modal = document.getElementById(`${type}-modal`);
        modal.classList.remove('hidden');
    }

    hideModal(type) {
        const modal = document.getElementById(`${type}-modal`);
        modal.classList.add('hidden');
    }

    showApiCheck() {
        const apiKey = this.youtubeApiKeyInput.value;
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=RU&maxResults=20&key=${apiKey}`;
        
        document.getElementById('api-url-display').textContent = apiUrl;
        this.showModal('api-check');
    }

    validateApiKey(type) {
        const input = type === 'youtube' ? this.youtubeApiKeyInput : this.openrouterKeyInput;
        const status = type === 'youtube' ? this.youtubeApiStatus : this.openrouterApiStatus;
        
        if (input.value.trim()) {
            status.innerHTML = '✅ API ключ введен';
            status.className = 'api-status status-success';
        } else {
            status.innerHTML = '❌ Требуется API ключ';
            status.className = 'api-status status-error';
        }
    }

    showError(message, type = 'error', canRetry = false, retryCallback = null) {
        this.errorContainer.classList.remove('hidden');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = type === 'error' ? 'error-message' : 'warning-message';
        
        const errorText = document.createElement('div');
        errorText.className = 'error-text';
        errorText.textContent = message;
        
        const errorActions = document.createElement('div');
        errorActions.className = 'error-actions';
        
        if (canRetry && retryCallback) {
            const retryBtn = document.createElement('button');
            retryBtn.className = 'btn btn--sm btn--outline';
            retryBtn.innerHTML = '🔄 Повторить';
            retryBtn.addEventListener('click', () => {
                errorDiv.remove();
                retryCallback();
            });
            errorActions.appendChild(retryBtn);
        }
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn btn--sm btn--outline';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => errorDiv.remove());
        errorActions.appendChild(closeBtn);
        
        errorDiv.appendChild(errorText);
        errorDiv.appendChild(errorActions);
        this.errorContainer.appendChild(errorDiv);
        
        // Auto-hide warnings after 10 seconds
        if (type === 'warning') {
            setTimeout(() => {
                if (errorDiv.parentNode) {
                    errorDiv.classList.add('fade-out');
                    setTimeout(() => errorDiv.remove(), 500);
                }
            }, 10000);
        }
    }

    setLoadingState(isLoading, elementId = null) {
        this.isLoading = isLoading;
        
        if (elementId) {
            const element = document.getElementById(elementId);
            const btnText = element.querySelector('.btn-text');
            const btnIcon = element.querySelector('.btn-icon');
            
            if (isLoading) {
                element.disabled = true;
                btnIcon.textContent = '⏳';
            } else {
                element.disabled = false;
                btnIcon.textContent = elementId.includes('analyze') ? '🧠' : '📥';
            }
        }
        
        if (elementId === 'load-videos-btn') {
            if (isLoading) {
                this.loadingSpinner.classList.remove('hidden');
                this.videosSection.classList.add('hidden');
            } else {
                this.loadingSpinner.classList.add('hidden');
            }
        }
    }

    async retryOperation(operation, ...args) {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation(...args);
            } catch (error) {
                // Don't retry 4xx client errors
                if (error.status && error.status >= 400 && error.status < 500) {
                    throw error;
                }
                
                if (attempt === this.maxRetries) {
                    throw error;
                }
                
                // Exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    async loadYouTubeVideos() {
        const apiKey = this.youtubeApiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showError('Введите YouTube API ключ', 'error');
            return;
        }
        
        this.setLoadingState(true, 'load-videos-btn');
        this.clearErrors();
        
        try {
            const videos = await this.retryOperation(this.fetchYouTubeVideos.bind(this), apiKey);
            this.videos = videos;
            this.renderVideos();
            this.analyzeAllBtn.disabled = false;
            this.youtubeApiStatus.innerHTML = '✅ Данные загружены успешно';
            this.youtubeApiStatus.className = 'api-status status-success';
        } catch (error) {
            this.handleYouTubeError(error);
        } finally {
            this.setLoadingState(false, 'load-videos-btn');
        }
    }

    async fetchYouTubeVideos(apiKey) {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=RU&maxResults=20&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            const error = new Error(data.error?.message || 'YouTube API error');
            error.status = response.status;
            error.code = data.error?.errors?.[0]?.reason;
            throw error;
        }

        // Получаем комментарии для каждого видео
        const videosWithComments = await Promise.all(data.items.map(async (item) => {
            try {
                const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${item.id}&maxResults=5&key=${apiKey}`;
                const commentsResponse = await fetch(commentsUrl);
                const commentsData = await commentsResponse.json();
                
                const comments = commentsData.items 
                    ? commentsData.items.map(comment => comment.snippet.topLevelComment.snippet.textDisplay)
                    : [];
                
                return {
                    ...item,
                    comments: comments
                };
            } catch (error) {
                console.warn(`Не удалось загрузить комментарии для ${item.id}:`, error);
                return {
                    ...item,
                    comments: []
                };
            }
        }));
        
        return videosWithComments.map(item => ({
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description || '',
            thumbnail: item.snippet.thumbnails.high.url,
            views: parseInt(item.statistics.viewCount),
            likes: parseInt(item.statistics.likeCount || 0),
            comments: item.comments || [],
            commentCount: parseInt(item.statistics.commentCount || 0),
            publishedAt: new Date(item.snippet.publishedAt),
            channelTitle: item.snippet.channelTitle,
            tags: item.snippet.tags || [],
            algorithmicRating: this.calculateAlgorithmicRating(item)
        }));
    }

    handleYouTubeError(error) {
        let message = 'Ошибка при загрузке данных YouTube';
        
        if (error.status === 403 && error.code === 'quotaExceeded') {
            message = '❌ Превышена дневная квота YouTube API';
        } else if (error.status === 400) {
            message = '❌ Неверные параметры запроса к YouTube API';
        } else if (error.status === 401) {
            message = '❌ Требуется авторизация API ключа YouTube';
        } else if (error.status >= 500) {
            message = '❌ Проблемы с сервером YouTube. Попробуйте позже';
        }
        
        const canRetry = error.status >= 500;
        this.showError(message, 'error', canRetry, () => this.loadYouTubeVideos());
        
        this.youtubeApiStatus.innerHTML = '❌ Ошибка загрузки';
        this.youtubeApiStatus.className = 'api-status status-error';
    }

    calculateAlgorithmicRating(video) {
        let rating = 50; // Base 50%
        
        // Алгоритмические факторы для молодежной аудитории 14-20 лет
        const factors = {
            gaming: 0.35,      // Игровая тематика
            challenges: 0.35,  // Челленджи и тренды
            music: 0.30,       // Музыкальный контент
            vlogs: 0.30,       // Влоги
            entertainment: 0.25, // Развлекательный контент
            shorts: 0.20,      // Короткий формат
            youngCreator: 0.15, // Молодой креатор
            interactive: 0.10   // Интерактивность
        };
        
        const stats = video.statistics;
        const snippet = video.snippet;
        const title = snippet.title.toLowerCase();
        const description = (snippet.description || '').toLowerCase();
        const tags = (snippet.tags || []).map(tag => tag.toLowerCase());
        
        // Определяем тип контента по ключевым словам
        if (this.containsAny(title, description, tags, ['игра', 'game', 'gameplay', 'летсплей', 'прохождение', 'майнкрафт', 'minecraft', 'gaming', 'геймер', 'gamer'])) {
            rating += 100 * factors.gaming;
        }
        
        if (this.containsAny(title, description, tags, ['челлендж', 'challenge', 'тренд', 'trend', 'вызов', 'tiktok', 'тикток'])) {
            rating += 100 * factors.challenges;
        }
        
        if (this.containsAny(title, description, tags, ['музыка', 'music', 'клип', 'рэп', 'реп', 'rap', 'pop', 'песня', 'трек', 'альбом', 'song'])) {
            rating += 100 * factors.music;
        }
        
        if (this.containsAny(title, description, tags, ['влог', 'vlog', 'день из жизни', 'дневник'])) {
            rating += 100 * factors.vlogs;
        }
        
        if (this.containsAny(title, description, tags, ['shorts', 'шортс', '#shorts', '#шортс', 'короткое видео'])) {
            rating += 100 * factors.shorts;
        }
        
        // Для молодых креаторов (анализ на основе названия канала)
        if (this.containsAny(snippet.channelTitle.toLowerCase(), [], [], ['блогер', 'blogger', 'young', 'молодой'])) {
            rating += 100 * factors.youngCreator;
        }
        
        // Оценка интерактивности
        if (this.containsAny(title, description, tags, ['подписывайтесь', 'лайк', 'комментируйте', 'опрос', 'голосование', 'выбирайте'])) {
            rating += 100 * factors.interactive;
        }
        
        // Like-to-view ratio для молодежной аудитории (молодежь активнее ставит лайки)
        const views = parseInt(stats.viewCount);
        const likes = parseInt(stats.likeCount || 0);
        const likeRatio = likes / views;
        
        if (likeRatio > 0.03) rating += 15;
        else if (likeRatio > 0.02) rating += 10;
        else if (likeRatio > 0.01) rating += 5;
        
        // Comment-to-view ratio (молодежь активнее комментирует)
        const comments = parseInt(stats.commentCount || 0);
        const commentRatio = comments / views;
        
        if (commentRatio > 0.02) rating += 15;
        else if (commentRatio > 0.01) rating += 10;
        else if (commentRatio > 0.005) rating += 5;
        
        // Видео не старше недели (молодежь предпочитает актуальный контент)
        const daysOld = (Date.now() - new Date(snippet.publishedAt)) / (1000 * 60 * 60 * 24);
        if (daysOld < 2) rating += 15;
        else if (daysOld < 7) rating += 10;
        else if (daysOld < 14) rating += 5;
        
        return Math.min(Math.round(rating), 100);
    }

    containsAny(title, description, tags, keywords) {
        for (const keyword of keywords) {
            if (title.includes(keyword) || description.includes(keyword)) {
                return true;
            }
            
            for (const tag of tags) {
                if (tag.includes(keyword)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    renderVideos() {
        this.videosGrid.innerHTML = '';
        
        this.videos.forEach(video => {
            const videoCard = this.createVideoCard(video);
            this.videosGrid.appendChild(videoCard);
        });
        
        this.videosSection.classList.remove('hidden');
    }

    createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';
        
        const formattedDate = video.publishedAt.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        card.innerHTML = `
            <div class="video-thumbnail">
                <img src="${video.thumbnail}" alt="${video.title}" loading="lazy">
            </div>
            <div class="video-info">
                <h3 class="video-title">
                    <a href="https://youtube.com/watch?v=${video.id}" target="_blank">${video.title}</a>
                </h3>
                <div class="video-stats">
                    <span>👁 ${this.formatNumber(video.views)}</span>
                    <span>👍 ${this.formatNumber(video.likes)}</span>
                    <span>💬 ${this.formatNumber(video.commentCount)}</span>
                </div>
                <div class="video-date">${formattedDate}</div>
                <div class="video-ratings">
                    <div class="rating-item">
                        <div class="rating-label">Алгоритм</div>
                        <div class="rating-value">${video.algorithmicRating}%</div>
                    </div>
                    <div class="rating-item">
                        <div class="rating-label">AI Анализ</div>
                        <div class="rating-value" id="ai-rating-${video.id}">??%</div>
                    </div>
                    <button class="btn btn--sm btn--secondary" onclick="dashboard.analyzeVideoWithAI('${video.id}')">
                        <span class="btn-text">🧠 AI Анализ</span>
                    </button>
                </div>
            </div>
        `;
        
        return card;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    async massAnalyzeVideos() {
        this.setLoadingState(true, 'analyze-all-btn');
        this.progressContainer.classList.remove('hidden');
        this.clearErrors();
        
        const total = this.videos.length;
        let completed = 0;
        
        for (const video of this.videos) {
            try {
                await this.analyzeVideoWithAI(video.id, false);
                completed++;
                this.updateProgress(completed, total);
            } catch (error) {
                console.error('Error analyzing video:', video.id, error);
                // Continue with other videos
            }
        }
        
        this.setLoadingState(false, 'analyze-all-btn');
        this.progressContainer.classList.add('hidden');
        
        if (completed === total) {
            this.showError('✅ Анализ всех видео завершен успешно', 'warning');
        } else {
            this.showError(`⚠️ Анализ завершен: ${completed}/${total} видео обработано`, 'warning');
        }
    }

    updateProgress(completed, total) {
        const percentage = (completed / total) * 100;
        this.progressFill.style.width = `${percentage}%`;
        this.progressText.textContent = `Анализ: ${completed}/${total}`;
    }

    async analyzeVideoWithAI(videoId, showModal = true) {
        // Check cache first (1 hour expiry)
        const cacheKey = videoId;
        const cached = this.aiCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 3600000) {
            this.updateVideoAIRating(videoId, cached.rating);
            if (showModal) {
                this.showAIResults(cached.analysis);
            }
            return;
        }
        
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;
        
        const apiKey = this.openrouterKeyInput.value.trim();
        const model = this.aiModelSelect.value;
        
        if (!apiKey) {
            this.showError('Введите OpenRouter API ключ для AI анализа', 'error');
            return;
        }
        
        try {
            const ratingElement = document.getElementById(`ai-rating-${videoId}`);
            if (ratingElement) {
                ratingElement.textContent = '⏳';
            }
            
            const result = await this.retryOperation(this.callOpenRouterAPI.bind(this), video, apiKey, model);
            
            // Cache result
            this.aiCache.set(cacheKey, {
                rating: result.rating,
                analysis: result.analysis,
                timestamp: Date.now()
            });
            
            this.updateVideoAIRating(videoId, result.rating);
            
            if (showModal) {
                this.showAIResults(result.analysis);
            }
            
        } catch (error) {
            this.handleOpenRouterError(error, videoId);
        }
    }

    async callOpenRouterAPI(video, apiKey, model) {
        // Новый промпт для анализа видео для аудитории 14-20 лет
        const prompt = this.buildYouthAnalysisPrompt(video);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7
                // Убран параметр max_tokens в соответствии с требованием
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const error = new Error(data.error?.message || 'OpenRouter API error');
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        const analysis = data.choices[0].message.content;
        const ratingMatch = analysis.match(/(\d+)%/);
        const rating = ratingMatch ? parseInt(ratingMatch[1]) : 50;
        
        return { rating, analysis };
    }

    // Специализированный промпт для анализа молодежной аудитории 14-20 лет
    buildYouthAnalysisPrompt(videoData) {
        return `Проанализируй привлекательность этого YouTube видео СПЕЦИАЛЬНО для российской молодежи 14-20 лет.

ВИДЕО: "${videoData.title}"
КАНАЛ: ${videoData.channelTitle}
ОПИСАНИЕ: ${videoData.description}
ТЕГИ: ${videoData.tags?.join(', ') || 'отсутствуют'}
КОММЕНТАРИИ: ${videoData.comments.join(' | ')}

КРИТЕРИИ АНАЛИЗА ДЛЯ АУДИТОРИИ 14-20 ЛЕТ:
1. Визуальная привлекательность (яркость, динамичность, мемы)
2. Актуальные тренды и челленджи
3. Музыкальный контент (рэп, поп, танцевальная музыка)
4. Игровая тематика и киберспорт
5. Блогерский контент и lifestyle
6. Юмор и развлекательность
7. Социальные сети и интернет-культура
8. Образовательный контент в развлекательной форме
9. Интерактивность и участие аудитории
10. Аутентичность и близость к молодежи

ВЕРНИ ТОЛЬКО ЧИСЛО (процент от 0 до 100) и 3-4 средних по длине тезиса почему именно такая оценка для аудитории 14-20 лет.

Формат ответа:
Привлекательность видео для ЦА 14-20 - 85%
• Геймерская тематика привлекает 73% подростков
• Динамичный монтаж удерживает внимание молодежи
• Актуальные мемы и сленг создают близость с аудиторией
• Интерактивные элементы стимулируют участие зрителей`;
    }

    handleOpenRouterError(error, videoId) {
        let message = 'Ошибка при анализе видео';
        
        if (error.status === 400 && error.data?.error?.message?.includes('No endpoints found')) {
            message = '❌ Модель заблокирована настройками конфиденциальности. Включите "Enable providers that may train on inputs" в OpenRouter';
        } else if (error.status === 429) {
            message = '❌ Превышен лимит запросов к OpenRouter API';
        } else if (error.status === 401) {
            message = '❌ Неверный OpenRouter API ключ';
        } else if (error.status >= 500) {
            message = '❌ Проблемы с сервером OpenRouter. Попробуйте позже';
        }
        
        this.showError(message, 'error', error.status >= 500, () => this.analyzeVideoWithAI(videoId));
        
        // Reset rating display
        const ratingElement = document.getElementById(`ai-rating-${videoId}`);
        if (ratingElement) {
            ratingElement.textContent = '❌';
        }
    }

    updateVideoAIRating(videoId, rating) {
        const ratingElement = document.getElementById(`ai-rating-${videoId}`);
        if (ratingElement) {
            ratingElement.textContent = `${rating}%`;
        }
    }

    showAIResults(analysis) {
        const content = document.getElementById('ai-results-content');
        
        // Simple markdown parsing
        let formattedAnalysis = analysis
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
        
        content.innerHTML = formattedAnalysis;
        this.showModal('ai-results');
    }

    clearErrors() {
        this.errorContainer.innerHTML = '';
        this.errorContainer.classList.add('hidden');
    }
}

// Initialize dashboard
const dashboard = new YouTubeTrendsDashboard();

// Expose for global access (needed for onclick handlers)
window.dashboard = dashboard;
