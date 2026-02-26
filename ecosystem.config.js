// ─────────────────────────────────────────────────────────────────────────────
// PM2 Ecosystem Configuration — VerifyOps Promo
//
// ⚠️  HOST / PORT 는 이 파일에 직접 작성하지 않습니다.
//     반드시 .env 파일 (또는 OS 환경변수) 로 주입하세요.
//     참고용 템플릿: .env.example
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

module.exports = {
    apps: [
        {
            // ── 앱 기본 설정 ────────────────────────────────────────
            name: process.env.APP_NAME || 'verifyops-promo',
            script: './server.js',

            // ── 실행 옵션 ────────────────────────────────────────────
            instances: 1,          // 단일 인스턴스 (nginx 뒤에서 운영)
            exec_mode: 'fork',
            autorestart: true,
            watch: false,       // 프로덕션에서 파일 감시 비활성
            max_memory_restart: '300M',

            // ── env 파일 로드 (PM2 v5+) ──────────────────────────────
            // PM2가 프로세스 시작 시 지정 파일의 KEY=VALUE 를 환경변수로 주입
            env_file: '.env',

            // ── 공통 환경변수 (env_file 로 대부분 관리, 여기선 상수만) ──
            env: {
                NODE_ENV: 'production',
            },

            // ── 로그 설정 ────────────────────────────────────────────
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
        },
    ],
};
