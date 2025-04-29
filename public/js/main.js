// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка треков с сервера
    fetch('/api/tracks')
        .then(response => response.json())
        .then(tracks => {
            tracks.forEach(track => {
                ui.addTrackToLibrary(track);
            });
        })
        .catch(error => console.error('Error loading tracks:', error));

    // Обработка загрузки треков
    document.getElementById('upload-btn').addEventListener('click', () => {
        document.getElementById('file-upload').click();
    });

    // Обработка выбора трека для загрузки в деку
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('track-item')) {
            const trackName = e.target.textContent;
            // Здесь можно добавить логику выбора деки для загрузки трека
            console.log(`Selected track: ${trackName}`);
        }
    });
}); 