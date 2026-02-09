// generate-author-pages.js
const fs = require('fs');
const path = require('path');

// Загружаем данные игр
const gamesData = require('./data/games.json');

// Создаем папку для страниц авторов, если её нет
const authorsDir = path.join(__dirname, 'author');
if (!fs.existsSync(authorsDir)) {
    fs.mkdirSync(authorsDir, { recursive: true });
}

// Собираем уникальные авторов
const uniqueAuthors = new Set();
gamesData.forEach(game => {
    if (game.author) {
        uniqueAuthors.add(game.author);
    }
});

// Для каждого автора создаем HTML файл
uniqueAuthors.forEach(author => {
    // Преобразуем имя автора в slug (для URL)
    const authorSlug = author
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]/g, '');
    
    const authorPageDir = path.join(authorsDir, authorSlug);
    
    // Создаем папку для конкретного автора
    if (!fs.existsSync(authorPageDir)) {
        fs.mkdirSync(authorPageDir, { recursive: true });
    }
    
    // Создаем HTML файл
    const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${author} - Переводы | крипт</title>
    
    <!-- Open Graph метатеги -->
    <meta property="og:title" content="${author} - Переводы в крипт">
    <meta property="og:description" content="Переводы от ${author} на сайте крипт">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://crypt.fans/author/${authorSlug}">
    
    <!-- Скрипт для перенаправления на основную страницу -->
    <script>
        // Сохраняем имя автора в localStorage для использования на all.html
        localStorage.setItem('filterByAuthor', '${author}');
        
        // Перенаправляем на страницу всех игр
        window.location.href = '/all.html';
    </script>
    
    <!-- Резервный редирект для браузеров без JavaScript -->
    <meta http-equiv="refresh" content="0; url=/all.html">
    
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
    <h1>${author}</h1>
    <p>Загрузка переводов...</p>
    
    <!-- Резервная ссылка для браузеров без JavaScript -->
    <noscript>
        <p>JavaScript отключен. Нажмите кнопку ниже для перехода к переводам:</p>
        <a href="/all.html" class="fallback-link">Перейти к переводам</a>
    </noscript>
    
    <script>
        // Если редирект не сработал через 5 секунд, показываем ссылку
        setTimeout(() => {
            const body = document.body;
            body.innerHTML = \`
                <h1>Редирект не сработал</h1>
                <p>Нажмите кнопку ниже для перехода к переводам:</p>
                <a href="/all.html" class="fallback-link">Перейти к переводам</a>
                <script>
                    // Пробуем еще раз через localStorage
                    localStorage.setItem('filterByAuthor', '${author}');
                </script>
            \`;
        }, 5000);
    </script>
</body>
</html>`;

    // Сохраняем файл
    const indexPath = path.join(authorPageDir, 'index.html');
    fs.writeFileSync(indexPath, htmlContent);
    
    console.log(`Создана страница для автора: ${author} (${authorSlug})`);
});

console.log(`\n✅ Создано ${uniqueAuthors.size} страниц авторов в папке /author/`);
