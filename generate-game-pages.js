// generate-game-pages.js
const fs = require('fs');
const path = require('path');

// Загружаем данные игр
const gamesData = require('./data/games.json');

// Создаем папку для страниц игр, если её нет
const gamesDir = path.join(__dirname, 'game');
if (!fs.existsSync(gamesDir)) {
    fs.mkdirSync(gamesDir, { recursive: true });
}

// Для каждой игры создаем HTML файл
gamesData.forEach(game => {
    const gameSlug = game.slug;
    const gamePageDir = path.join(gamesDir, gameSlug);
    
    // Создаем папку для конкретной игры
    if (!fs.existsSync(gamePageDir)) {
        fs.mkdirSync(gamePageDir, { recursive: true });
    }
    
    // Создаем HTML файл
    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${game.titleRu} | крипт</title>
    
    <!-- Open Graph метатеги -->
    <meta property="og:title" content="${game.titleRu} | крипт">
    <meta property="og:description" content="${game.description.substring(0, 150)}...">
    <meta property="og:image" content="${game.coverImage}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://crypt.fans/game/${gameSlug}">
    
    <!-- Скрипт для перенаправления на основную страницу игры -->
    <script>
        // Сохраняем slug в localStorage для использования на game.html
        localStorage.setItem('currentGameSlug', '${gameSlug}');
        
        // Перенаправляем на основную страницу игры
        window.location.href = '/game.html';
    </script>
    
    <!-- Резервный редирект для браузеров без JavaScript -->
    <meta http-equiv="refresh" content="0; url=/game.html">
    
    <!-- Стили для страницы-заглушки -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #1a1a1a;
            color: #e0e0e0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            text-align: center;
        }
        
        .loader {
            width: 50px;
            height: 50px;
            border: 5px solid #2d2d2d;
            border-top: 5px solid #e3a945;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        h1 {
            color: #e3a945;
            margin-bottom: 10px;
        }
        
        p {
            color: #b0b0b0;
            margin-bottom: 20px;
        }
        
        .fallback-link {
            color: #e3a945;
            text-decoration: none;
            border: 1px solid #e3a945;
            padding: 10px 20px;
            border-radius: 6px;
            transition: all 0.3s ease;
        }
        
        .fallback-link:hover {
            background-color: #e3a945;
            color: #121212;
        }
    </style>
</head>
<body>
    <div class="loader"></div>
    <h1>${game.titleRu}</h1>
    <p>Загрузка перевода...</p>
    
    <!-- Резервная ссылка для браузеров без JavaScript -->
    <noscript>
        <p>JavaScript отключен. Нажмите кнопку ниже для перехода к переводу:</p>
        <a href="/game.html" class="fallback-link">Перейти к переводу</a>
    </noscript>
    
    <script>
        // Если редирект не сработал через 5 секунд, показываем ссылку
        setTimeout(() => {
            const body = document.body;
            body.innerHTML = \`
                <h1>Редирект не сработал</h1>
                <p>Нажмите кнопку ниже для перехода к переводу:</p>
                <a href="/game.html" class="fallback-link">Перейти к переводу</a>
                <script>
                    // Пробуем еще раз через localStorage
                    localStorage.setItem('currentGameSlug', '${gameSlug}');
                </script>
            \`;
        }, 5000);
    </script>
</body>
</html>`;

    // Сохраняем файл
    const indexPath = path.join(gamePageDir, 'index.html');
    fs.writeFileSync(indexPath, htmlContent);
    
    console.log(`Создана страница для: ${game.titleRu} (${gameSlug})`);
});

console.log(`\n✅ Создано ${gamesData.length} страниц игр в папке /game/`);