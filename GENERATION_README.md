# Crypt Site - Скрипты генерации

## Генерация страниц игр

Для генерации красивых URL для страниц игр (формат `/game/gamename`):

```bash
node generate-game-pages.js
```

Это создаст папки в директории `/game/` для каждой игры из `data/games.json` с файлами `index.html`, которые перенаправляют на `/game.html`.

## Генерация страниц авторов

Для генерации красивых URL для страниц авторов (формат `/author/authorname`):

```bash
node generate-author-pages.js
```

Это создаст папки в директории `/author/` для каждого автора из `data/games.json` с файлами `index.html`, которые перенаправляют на `/all.html` с фильтром по автору.

## Как работает система

### Для игр
1. Пользователь переходит на `https://crypt-site.com/game/gamename`
2. Загружается файл `/game/gamename/index.html`
3. Скрипт в файле сохраняет slug в `localStorage` и перенаправляет на `/game.html`
4. На странице `/game.html` функция `loadGameDetails()` получает slug из пути URL или localStorage
5. Информация об игре загружается и отображается на странице

### Для авторов
1. Пользователь кликает на автора в навигации или нажимает на кнопку авторского фильтра
2. Страница перенаправляется на `https://crypt-site.com/author/authorname`
3. Загружается файл `/author/authorname/index.html`
4. Скрипт в файле сохраняет имя автора в `localStorage` и перенаправляет на `/all.html`
5. На странице `/all.html` функция `loadGames()` проверяет `localStorage` и применяет фильтр по автору

## Запуск перед деплоем

Перед каждым деплоем на GitHub Pages выполните:

```bash
node generate-game-pages.js
node generate-author-pages.js
```

Это убедится, что все страницы игр и авторов актуальны на основе последних данных из `data/games.json`.
