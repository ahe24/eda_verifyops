'use strict';

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── Static files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'eda_promo'), {
    // 캐시: 프로덕션에서 1시간, 개발에서 비활성화
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
    etag: true,
}));

// ── Health check (PM2, reverse proxy 모니터링용) ─────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'verifyops-promo', uptime: process.uptime() });
});

// ── 향후 API 라우트 확장 예시 (필요 시 주석 해제) ────────────
// const apiRouter = require('./src/routes/api');
// app.use('/api', apiRouter);

// ── Fallback → index.html (SPA 라우팅 대비) ──────────────────
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'eda_promo', 'index.html'));
});

// ── 서버 시작 ─────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
    console.log(`[VerifyOps] Server running → http://${HOST}:${PORT}  (${process.env.NODE_ENV || 'development'})`);
});
