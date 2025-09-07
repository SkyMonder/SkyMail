# SkyMail

Закрытая почта + звонки (WebRTC).

## Как запустить на Render

1. Создать PostgreSQL и скопировать DATABASE_URL.
2. В backend/.env задать DATABASE_URL и JWT_SECRET.
3. `npm install` в backend/ и запустить `npm start`.
4. Задеплоить backend как Web Service, frontend как Static Site.
