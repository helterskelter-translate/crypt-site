// Глобальные переменные
let allGames = [];
let filteredGames = [];
let activeTags = new Set();
let searchQuery = '';
let selectedAuthor = 'all';
let currentPage = 1;
const gamesPerPage = 12;
let isLoadingMore = false;
let currentSort = 'date-desc';

function generateSitemap(games) {
    const baseUrl = 'https://crypt-translations.ru';
    const today = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}/</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
    
    <url>
        <loc>${baseUrl}/all</loc>
        <lastmod>${today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    
    <url>
        <loc>${baseUrl}/favorites</loc>
        <lastmod>${today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
    
    games.forEach(game => {
        sitemap += `
    <url>
        <loc>${baseUrl}/game/${game.slug}</loc>
        <lastmod>${game.dateAdded || today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`;
    });
    
    sitemap += '\n</urlset>';
    return sitemap;
}

// Загрузка данных игр
async function loadGames(mode = 'latest') {
    try {
        const response = await fetch('data/games.json');
        if (!response.ok) throw new Error('Не удалось загрузить данные');
        
        allGames = await response.json();
        
        // Сортируем игры по дате добавления (новые первыми)
        allGames.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        
        if (mode === 'latest') {
            displayLatestGames();
            displayInProgressGames();
            displayPlannedGames();
        } else if (mode === 'all') {
            displayAllGames();
            initializeTagsFilter();
            initializeSearch();
            initializeAuthorFilter();
            
            // Фильтруем игры если есть параметры URL
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('search') || urlParams.has('author') || urlParams.has('tag')) {
                filterGames();
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки игр:', error);
        showError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
    }
}

// Функция для обновления страницы избранного при изменении
function updateFavoritesPage() {
    if (window.location.pathname.includes('favorites.html')) {
        loadFavorites();
    }
}

// Модифицируем toggleFavoriteCard() для обновления страницы
function toggleFavoriteCard(gameId, button) {
    const wasAdded = toggleFavorite(gameId);
    
    if (wasAdded) {
        button.classList.add('active');
        button.querySelector('svg').setAttribute('fill', '#e3a945');
        showNotification('Добавлено в избранное');
    } else {
        button.classList.remove('active');
        button.querySelector('svg').setAttribute('fill', 'none');
        showNotification('Удалено из избранного');
        
        // Если мы на странице избранного, перезагружаем список
        if (window.location.pathname.includes('favorites.html')) {
            setTimeout(() => {
                loadFavorites();
            }, 300);
        }
    }
}

// Функция загрузки избранных игр (для favorites.html)
async function loadFavorites() {
    try {
        const container = document.getElementById('favorites-container');
        const countElement = document.getElementById('favorites-count');
        const emptyElement = document.getElementById('empty-favorites');
        
        if (!container) return;
        
        // Загружаем данные игр
        const response = await fetch('data/games.json');
        if (!response.ok) throw new Error('Не удалось загрузить данные');
        
        const allGames = await response.json();
        
        // Получаем ID избранных игр
        const favorites = getFavorites();
        
        // Обновляем счетчик
        if (countElement) {
            countElement.textContent = favorites.length;
        }
        
        if (favorites.length === 0) {
            // Показываем сообщение "пусто"
            if (emptyElement) {
                emptyElement.style.display = 'block';
            }
            container.innerHTML = '';
            return;
        }
        
        // Скрываем сообщение "пусто"
        if (emptyElement) {
            emptyElement.style.display = 'none';
        }
        
        // Фильтруем избранные игры
        const favoriteGames = allGames.filter(game => favorites.includes(game.id));
        
        // Отображаем избранные игры
        container.innerHTML = favoriteGames.map(game => createGameCard(game)).join('');
        
    } catch (error) {
        console.error('Ошибка загрузки избранного:', error);
        
        // Показываем сообщение об ошибке
        const container = document.getElementById('favorites-container');
        if (container) {
            container.innerHTML = `
                <div class="no-results">
                    <p>Не удалось загрузить избранные игры.</p>
                    <button class="btn" onclick="loadFavorites()">Попробовать снова</button>
                </div>
            `;
        }
    }
}

// Отображение последних игр на главной
function displayLatestGames() {
    const container = document.getElementById('latest-games-container');
    if (!container) return;
    
    // Фильтруем только готовые игры
    const completedGames = allGames.filter(game => (game.status || 'completed') === 'completed');
    
    // Берем первые 6 готовых игр
    const latestGames = completedGames.slice(0, 6);
    
    if (latestGames.length === 0) {
        container.innerHTML = '<div class="no-results"><p>Переводы пока не добавлены.</p></div>';
        return;
    }
    
    container.innerHTML = latestGames.map(game => createGameCard(game)).join('');
}

// Функция для отображения запланированных игр
function displayPlannedGames() {
    const container = document.getElementById('planned-container');
    if (!container) return;
    
    // Фильтруем игры со статусом "planned"
    const plannedGames = allGames.filter(game => game.status === 'planned');
    
    if (plannedGames.length === 0) {
        container.innerHTML = '<div class="no-results"><p>Сейчас нет запланированных переводов.</p></div>';
        return;
    }
    
    // Берем все запланированные игры
    const gamesToShow = plannedGames.slice(0, 6);
    container.innerHTML = gamesToShow.map(game => createGameCard(game)).join('');
}

// Отображение всех игр
function displayAllGames(loadMore = false) {
    const container = document.getElementById('all-games-container');
    const countElement = document.getElementById('games-count');
    const noResultsElement = document.getElementById('no-results');
    const loadMoreContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    if (!container) return;
    
    // Фильтрация игр
    filteredGames = filterGamesArray();
    
    // Обновление счетчика
    if (countElement) {
        countElement.textContent = filteredGames.length;
    }
    
    // Рассчитываем сколько игр показывать
    let gamesToShow = [];
    if (loadMore) {
        currentPage++;
        gamesToShow = filteredGames.slice(0, currentPage * gamesPerPage);
    } else {
        currentPage = 1;
        gamesToShow = filteredGames.slice(0, gamesPerPage);
    }
    
    // Проверяем, есть ли еще игры для загрузки
    const hasMoreGames = gamesToShow.length < filteredGames.length;
    
    // Отображение игр
    if (filteredGames.length === 0) {
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Показываем сообщение "нет результатов"
        if (noResultsElement) {
            noResultsElement.style.display = 'block';
        }
        
        // Скрываем кнопку "Показать еще"
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    } else {
        // Скрываем сообщение "нет результатов"
        if (noResultsElement) {
            noResultsElement.style.display = 'none';
        }
        
        if (!loadMore) {
            // Первая загрузка - заменяем весь контент
            container.innerHTML = gamesToShow.map(game => createGameCard(game)).join('');
        } else {
            // Дозагрузка - добавляем к существующему
            const newGamesHtml = gamesToShow.slice((currentPage - 1) * gamesPerPage).map(game => createGameCard(game)).join('');
            container.insertAdjacentHTML('beforeend', newGamesHtml);
        }
        
        // Обновляем кнопку "Показать еще"
        if (loadMoreContainer && loadMoreBtn) {
            if (hasMoreGames) {
                loadMoreContainer.style.display = 'block';
                loadMoreBtn.disabled = false;
                loadMoreBtn.innerHTML = `Показать еще (${filteredGames.length - gamesToShow.length} осталось)`;
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
    }
    
    isLoadingMore = false;
}

// Функция для загрузки дополнительных игр
function loadMoreGames() {
    if (isLoadingMore) return;
    isLoadingMore = true;
    displayAllGames(true);
}

function resetFilters() {
    activeTags.clear();
    searchQuery = '';
    selectedAuthor = 'all';
    currentPage = 1;
    
    // Сброс UI
    document.querySelectorAll('.tag-filter').forEach(btn => btn.classList.remove('active'));
    const searchInput = document.getElementById('filter-search');
    if (searchInput) searchInput.value = '';
    
    // Сброс фильтра авторов
    document.querySelectorAll('.author-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.author === 'all') {
            btn.classList.add('active');
        }
    });
    
    displayAllGames(false);
    
    // Скрываем кнопку "Показать еще"
    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) loadMoreContainer.style.display = 'none';
    
    // Очищаем URL параметры
    const url = new URL(window.location);
    url.search = '';
    window.history.pushState({}, '', url);
}

// Функции для работы с избранным
function getFavorites() {
    const favorites = localStorage.getItem('crypt-favorites');
    return favorites ? JSON.parse(favorites) : [];
}

function toggleFavorite(gameId) {
    const favorites = getFavorites();
    const index = favorites.indexOf(gameId);
    
    if (index === -1) {
        favorites.push(gameId);
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('crypt-favorites', JSON.stringify(favorites));
    return index === -1; // Возвращает true если добавили, false если удалили
}

function isFavorite(gameId) {
    const favorites = getFavorites();
    return favorites.includes(gameId);
}

// Создание карточки игры
// Упрощенная версия для тестирования
function createGameCard(game) {
    const truncatedDescription = game.description.length > 150 
        ? game.description.substring(0, 150) + '...' 
        : game.description;
    
    const tagsHtml = game.tags.map(tag => 
        `<span class="game-tag">${tag}</span>`
    ).join('');
    
    const isFav = isFavorite(game.id);
    const statusBadge = getStatusBadge(game.status || 'completed'); // Добавляем значение по умолчанию

    return `
        <div class="game-card">
            <a href="game/${game.slug}" class="game-card-link">
                <img src="${game.coverImage}" alt="${game.titleRu}" class="game-cover">
                ${statusBadge}
                <div class="game-info">
                    <div class="game-header-row">
                        <h3 class="game-title">${game.titleRu}</h3>
                        <button class="favorite-btn ${isFav ? 'active' : ''}" data-id="${game.id}" onclick="event.preventDefault(); toggleFavoriteCard(${game.id}, this)">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="${isFav ? '#e3a945' : 'none'}" stroke="#e3a945" stroke-width="2">
                                <path d="M10 15.25L8.55 14.03C6.4 12.12 5 10.78 5 9.03C5 7.58 6.08 6.5 7.5 6.5C8.32 6.5 9.12 6.91 9.6 7.55H10.4C10.88 6.91 11.68 6.5 12.5 6.5C13.92 6.5 15 7.58 15 9.03C15 10.78 13.6 12.12 11.45 14.03L10 15.25Z"/>
                            </svg>
                        </button>
                    </div>
                    <p class="game-description">${truncatedDescription}</p>
                    <div class="game-meta">
                        <span>${game.year}</span>
                        <span class="game-author">${game.author || 'Не указан'}</span>
                    </div>
                    <div class="game-tags">
                        ${tagsHtml}
                    </div>
                </div>
            </a>
        </div>
    `;
}

function getStatusBadge(status) {
    const statuses = {
        'completed': { text: 'Готов', class: 'status-completed' },
        'in-progress': { text: 'В процессе', class: 'status-in-progress' },
        'planned': { text: 'Запланирован', class: 'status-planned' }
    };
    
    const statusInfo = statuses[status] || { text: '', class: '' };
    
    if (statusInfo.text) {
        return `<div class="status-badge ${statusInfo.class}">${statusInfo.text}</div>`;
    }
    return '';
}

// Функция для отображения игр в процессе перевода
function displayInProgressGames() {
    const container = document.getElementById('in-progress-container');
    if (!container) return;
    
    // Фильтруем игры со статусом "in-progress"
    const inProgressGames = allGames.filter(game => game.status === 'in-progress');
    
    if (inProgressGames.length === 0) {
        container.innerHTML = '<div class="no-results"><p>Сейчас нет игр в процессе перевода.</p></div>';
        return;
    }
    
    // Берем первые 6 игр в процессе перевода
    const gamesToShow = inProgressGames.slice(0, 6);
    container.innerHTML = gamesToShow.map(game => createGameCard(game)).join('');
}

// Функция для показа уведомлений
function showNotification(message) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e3a945;
        color: #121212;
        padding: 12px 20px;
        border-radius: 6px;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Простая система комментариев
function getComments(gameId) {
    const allComments = JSON.parse(localStorage.getItem('crypt-comments') || '{}');
    return allComments[gameId] || [];
}

function addComment(gameId, text, rating = 0) {
    const allComments = JSON.parse(localStorage.getItem('crypt-comments') || '{}');
    if (!allComments[gameId]) allComments[gameId] = [];
    
    const comment = {
        id: Date.now(),
        text: text,
        rating: rating,
        date: new Date().toISOString(),
        user: 'Аноним' // или можно запросить имя
    };
    
    allComments[gameId].push(comment);
    localStorage.setItem('crypt-comments', JSON.stringify(allComments));
    return comment;
}

// Инициализация фильтра по тегам
function initializeTagsFilter() {
    const tagsContainer = document.getElementById('tags-container');
    if (!tagsContainer) return;
    
    // Собираем все уникальные теги
    const allTags = new Set();
    allGames.forEach(game => {
        game.tags.forEach(tag => allTags.add(tag));
    });
    
    // Создаем кнопки тегов
    const tagsArray = Array.from(allTags).sort();
    tagsContainer.innerHTML = tagsArray.map(tag => 
        `<button class="tag-filter" data-tag="${tag}">${tag}</button>`
    ).join('');
    
    // Обработчики кликов на теги
    const tagButtons = document.querySelectorAll('.tag-filter');
    tagButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tag = this.dataset.tag;
            this.classList.toggle('active');
            
            if (this.classList.contains('active')) {
                activeTags.add(tag);
            } else {
                activeTags.delete(tag);
            }
            
            filterGames();
        });
    });
    
    // Проверяем тег из URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const tagParam = urlParams.get('tag');
    if (tagParam) {
        const decodedTag = decodeURIComponent(tagParam);
        // Активируем соответствующий тег
        tagButtons.forEach(btn => {
            if (btn.dataset.tag === decodedTag) {
                btn.classList.add('active');
                activeTags.add(decodedTag);
            }
        });
    }
    
    // Кнопка сброса фильтров
    const clearFiltersBtn = document.getElementById('clear-filters');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', resetFilters);
    }
}

// Инициализация фильтра по авторам
function initializeAuthorFilter() {
    const authorButtons = document.querySelectorAll('.author-filter-btn');
    
    // Устанавливаем активную кнопку на основе URL параметров или "Все авторы"
    const urlParams = new URLSearchParams(window.location.search);
    const authorParam = urlParams.get('author');
    
    if (authorParam) {
        selectedAuthor = authorParam;
    }
    
    // Устанавливаем активный класс
    authorButtons.forEach(btn => {
        if ((!authorParam && btn.dataset.author === 'all') || 
            (authorParam && btn.dataset.author === authorParam)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Обработчики для фильтра по авторам
    authorButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Обновляем URL без полной перезагрузки
            const url = new URL(window.location);
            if (this.dataset.author === 'all') {
                url.searchParams.delete('author');
            } else {
                url.searchParams.set('author', this.dataset.author);
            }
            window.history.pushState({}, '', url);
            
            // Обновляем фильтр
            selectedAuthor = this.dataset.author;
            filterGames();
            
            // Обновляем активные кнопки
            authorButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Инициализация поиска
function initializeSearch() {
    const searchInput = document.getElementById('filter-search');
    if (!searchInput) return;
    
    // Устанавливаем начальное значение из URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
        searchInput.value = decodeURIComponent(searchParam);
        searchQuery = decodeURIComponent(searchParam).toLowerCase();
    }
    
    searchInput.addEventListener('input', function() {
        searchQuery = this.value.trim().toLowerCase();
        filterGames();
    });
}

// Фильтрация игр
function filterGames() {
    displayAllGames();
}

// Функция сортировки
function sortGames(games) {
    switch(currentSort) {
        case 'date-desc':
            return [...games].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        case 'date-asc':
            return [...games].sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
        case 'year-desc':
            return [...games].sort((a, b) => b.year - a.year);
        case 'year-asc':
            return [...games].sort((a, b) => a.year - b.year);
        case 'title-asc':
            return [...games].sort((a, b) => a.titleRu.localeCompare(b.titleRu));
        case 'title-desc':
            return [...games].sort((a, b) => b.titleRu.localeCompare(a.titleRu));
        default:
            return games;
    }
}

// Фильтрация массива игр
function filterGamesArray() {
    let filtered = allGames.filter(game => {
        // Фильтр по поисковому запросу
        const matchesSearch = !searchQuery || 
            game.titleRu.toLowerCase().includes(searchQuery) ||
            game.titleEn.toLowerCase().includes(searchQuery) ||
            game.description.toLowerCase().includes(searchQuery);
        
        // Фильтр по тегам
        const matchesTags = activeTags.size === 0 || 
            Array.from(activeTags).every(tag => game.tags.includes(tag));
        
        // Фильтр по автору
        const normalizedGameAuthor = (game.author || '').toLowerCase().replace(/\s+/g, '-');
        const normalizedSelectedAuthor = selectedAuthor.toLowerCase();
        const matchesAuthor = normalizedSelectedAuthor === 'all' || normalizedGameAuthor === normalizedSelectedAuthor;
        
        return matchesSearch && matchesTags && matchesAuthor;
    });
    
    // Применяем сортировку
    return sortGames(filtered);
}

// Функция изменения сортировки
function changeSort(sortType) {
    currentSort = sortType;
    currentPage = 1; // Сбрасываем пагинацию
    displayAllGames(false);
    
    // Обновляем активную кнопку сортировки
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.sort === sortType) {
            btn.classList.add('active');
        }
    });
}

// Загрузка деталей игры
async function loadGameDetails() {
    try {
        // Получаем slug из URL
        const path = window.location.pathname;
        let gameSlug = null;
        
        // Определяем, откуда берём slug
        if (path.includes('/game/')) {
            // Красивый URL: /game/exocolonist
            gameSlug = path.split('/game/')[1];
        } else {
            // Старый URL: game.html?slug=exocolonist
            const urlParams = new URLSearchParams(window.location.search);
            gameSlug = urlParams.get('slug') || urlParams.get('id'); // Поддержка старых ссылок
        }
        
        if (!gameSlug) {
            showError('Игра не найдена.');
            return;
        }
        
        // Загружаем данные игр
        const response = await fetch('data/games.json');
        if (!response.ok) throw new Error('Не удалось загрузить данные');
        
        const games = await response.json();
        
        // Ищем игру по slug или id
        const game = games.find(g => 
            g.slug === gameSlug || 
            g.id.toString() === gameSlug
        );
        
        if (!game) {
            showError('Игра не найдена.');
            return;
        }
        
        displayGameDetails(game);
        updatePageTitle(game);
        
    } catch (error) {
        console.error('Ошибка загрузки деталей игры:', error);
        showError('Не удалось загрузить информацию об игре.');
    }
}

function getStatusText(status) {
    const statuses = {
        'completed': 'Полный перевод',
        'in-progress': 'Перевод в процессе',
        'planned': 'Перевод запланирован'
    };
    return statuses[status] || 'Статус неизвестен';
}

// Отображение деталей игры
function displayGameDetails(game) {
    const container = document.getElementById('game-container');
    if (!container) return;
    
    // Функция для безопасного экранирования HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Безопасное экранирование всех текстовых данных
    const safeTitleRu = escapeHtml(game.titleRu);
    const safeTitleEn = escapeHtml(game.titleEn);
    const safeGenre = escapeHtml(game.genre);
    const safeDeveloper = escapeHtml(game.developer);
    const safeAuthor = game.author ? escapeHtml(game.author) : '';
    const safeDescription = escapeHtml(game.description);
    const safeTranslatorNotes = game.translatorNotes ? 
        escapeHtml(game.translatorNotes).replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>') : '';
    
    // Получаем текст статуса
    const gameStatus = game.status || 'completed';

    console.log('=== ДЕБАГ СТАТУСА ПЕРЕВОДА ===');
    console.log('game объект:', game);
    console.log('game.status из JSON:', game.status);
    console.log('gameStatus переменная:', gameStatus);
    console.log('statusText из getStatusText():', getStatusText(gameStatus));
    console.log('getStatusText("completed"):', getStatusText('completed'));
    console.log('getStatusText("in-progress"):', getStatusText('in-progress'));
    console.log('getStatusText("planned"):', getStatusText('planned'));
    console.log('==============================');
    
    const statusText = getStatusText(gameStatus);
    
    // Проверяем, завершен ли перевод
    const isCompleted = gameStatus === 'completed';
    
    // Создаем HTML для кнопки скачивания
    const downloadBtnHtml = isCompleted 
        ? `<a href="${game.downloadUrl}" class="download-btn" target="_blank" rel="noopener noreferrer">Скачать перевод</a>`
        : `<button class="download-btn disabled" disabled>Перевод в разработке</button>`;
    
    // Создаем HTML для скриншотов с FSLightbox
    const screenshotsHtml = game.screenshots && game.screenshots.length > 0 ? `
        <div class="screenshots-section">
            <h3 class="section-title">Скриншоты</h3>
            <div class="screenshots-grid">
                ${game.screenshots.map((screenshot, index) => `
                    <a href="${screenshot}" data-fslightbox="game-screenshots">
                        <img src="${screenshot}" alt="Скриншот ${index + 1}" class="screenshot-thumb">
                    </a>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    // Создаем HTML для тегов (кликабельные)
    const tagsHtml = game.tags.map(tag => 
        `<a href="javascript:void(0)" class="game-tag" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</a>`
    ).join('');
    
    const safeTitleForAlt = safeTitleRu;
    
    const html = `
        <div class="game-details-container">
            <div class="game-header">
                <img src="${game.coverImage}" alt="${safeTitleRu}" class="game-header-cover">
                <div class="game-header-content">
                    <h1 class="game-header-title">${safeTitleRu}</h1>
                    <h2 class="game-header-subtitle">${safeTitleEn}</h2>
                </div>
            </div>
            
            <div class="game-content">
                <div class="game-info-grid">
                    <div class="info-block">
                        <div class="info-title">Жанр</div>
                        <div class="info-value">${safeGenre}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-title">Разработчик</div>
                        <div class="info-value">${safeDeveloper}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-title">Год выпуска</div>
                        <div class="info-value">${game.year}</div>
                    </div>
                    <div class="info-block">
                        <div class="info-title">Статус перевода</div>
                        <div class="info-value">${gameStatus ? statusText : 'Статус неизвестен'}
                        </div>
                    </div>
                    ${safeAuthor ? `
                    <div class="info-block">
                        <div class="info-title">Автор перевода</div>
                        <div class="info-value">${safeAuthor}</div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="game-description-full">
                    <h3 class="section-title">Описание</h3>
                    <p>${safeDescription}</p>
                </div>
                
                ${screenshotsHtml}
                
                <div class="download-section">
                    <div class="download-info">
                        <span>Версия: ${game.version}</span>
                        <span>Размер: ${isCompleted ? game.fileSize : '—'}</span>
                        <span>Обновлено: ${formatDate(game.dateAdded)}</span>
                    </div>
                    ${downloadBtnHtml}
                    <p style="margin-top: 15px; color: #888; font-size: 0.9rem;">
                        ${isCompleted 
                            ? 'Примечание: Для установки перевода следуйте инструкциям в архиве.' 
                            : 'Этот перевод находится в разработке. Следите за обновлениями!'}
                    </p>
                </div>
                
                ${safeTranslatorNotes ? `
                    <div class="translator-notes">
                        <div class="info-title">Заметки переводчика</div>
                        <div class="info-value">${safeTranslatorNotes}</div>
                    </div>
                ` : ''}
                
                <div class="game-tags-details">
                    ${tagsHtml}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Добавляем обработчики для тегов
    setTimeout(() => {
        const tagLinks = container.querySelectorAll('.game-tag[data-tag]');
        tagLinks.forEach(tagLink => {
            tagLink.addEventListener('click', function(e) {
                e.preventDefault();
                const tag = this.dataset.tag;
                window.location.href = `all.html?tag=${encodeURIComponent(tag)}`;
            });
        });
    }, 100);
    
    // Обновляем FSLightbox после добавления контента
    if (typeof refreshFsLightbox === 'function') {
        refreshFsLightbox();
    }
}

// Обновление заголовка страницы
function updatePageTitle(game) {
    document.title = `${game.titleRu} | крипт`;
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
}

// Показать ошибку
function showError(message) {
    const container = document.getElementById('latest-games-container') || 
                     document.getElementById('all-games-container') || 
                     document.getElementById('game-container');
    
    if (container) {
        // Сначала скрываем стандартное сообщение "нет результатов"
        const noResultsElement = document.getElementById('no-results');
        if (noResultsElement) noResultsElement.style.display = 'none';
        
        // Затем показываем ошибку
        container.innerHTML = `
            <div class="no-results">
                <p>${message}</p>
                <button class="btn" onclick="location.reload()">Обновить страницу</button>
            </div>
        `;
    }
}

// Обработка изменения истории браузера
window.addEventListener('popstate', function() {
    // Обновляем параметры из URL
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.has('author')) {
        selectedAuthor = urlParams.get('author');
    } else {
        selectedAuthor = 'all';
    }
    
    if (urlParams.has('search')) {
        searchQuery = decodeURIComponent(urlParams.get('search')).toLowerCase();
        const searchInput = document.getElementById('filter-search');
        if (searchInput) searchInput.value = searchQuery;
    } else {
        searchQuery = '';
    }
    
    // Обновляем активные теги
    if (urlParams.has('tag')) {
        const tagParam = decodeURIComponent(urlParams.get('tag'));
        activeTags.clear();
        activeTags.add(tagParam);
    } else {
        activeTags.clear();
    }
    
    // Обновляем UI и фильтруем игры
    if (typeof initializeAuthorFilter === 'function') {
        initializeAuthorFilter();
    }
    if (typeof filterGames === 'function') {
        filterGames();
    }
});

// Экспортируем функции для использования в HTML
window.loadGames = loadGames;
window.loadGameDetails = loadGameDetails;
window.filterGames = filterGames;
window.resetFilters = resetFilters;
window.loadMoreGames = loadMoreGames;
window.changeSort = changeSort;
window.toggleFavoriteCard = toggleFavoriteCard;
window.loadFavorites = loadFavorites;