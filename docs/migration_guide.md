# VerifyOps — Rocky Linux 서버 마이그레이션 가이드

> **Windows PC → Rocky Linux 서버** 배포 절차  
> 작성일: 2026-02-26 | 작성: Changseon Jo

---

## 📋 사전 요구사항

| 항목 | 최소 버전 | 확인 명령 |
|------|----------|----------|
| Node.js | 18.x+ | `node -v` |
| npm | 9.x+ | `npm -v` |
| PM2 | 5.x+ | `pm2 -v` |
| Git | 2.x+ | `git --version` |

---

## 🏗️ 프로젝트 구조

```
eda_dv_toolflow/                ← 프로젝트 루트
├── server.js                   ← Express 정적 서버 (진입점)
├── ecosystem.config.js         ← PM2 설정 (HOST/PORT는 .env에서 주입)
├── package.json                ← 의존성 및 스크립트
├── tsconfig.json               ← TypeScript 설정 (확장용)
├── .env.example                ← 환경변수 템플릿
├── .gitignore
├── eda_promo/                  ← 프로모션 정적 사이트
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── images/
├── src/                        ← 향후 TypeScript 확장 코드
│   └── index.ts
├── docs/
│   ├── plan.md
│   └── migration_guide.md      ← 이 문서
└── logs/                       ← PM2 로그 (자동 생성)
```

---

## 1단계: Windows PC에서 Git 초기화 및 Push

### 1.1 기존 http-server 중지

```powershell
# 실행 중인 테스트 서버가 있다면 중지
Ctrl+C
```

### 1.2 Git 초기화 및 사용자 설정

```powershell
cd d:\a4_antigravity\eda_dv_toolflow

# Git 초기화
git init

# 사용자 정보 설정 (로컬)
git config user.name "Changseon Jo"
git config user.email "cs.jo@ednc.com"

# 원격 저장소 등록
git remote add origin https://github.com/ahe24/eda_verifyops.git
```

### 1.3 첫 커밋 및 Push

```powershell
git add .
git commit -m "feat: initial VerifyOps promo site with PM2 deployment config"
git branch -M main
git push -u origin main
```

> [!TIP]
> GitHub 인증이 필요하면 Personal Access Token 또는 SSH 키를 사용하세요.

---

## 2단계: Rocky Linux 서버 배포

### 2.1 프로젝트 Clone

```bash
# 적절한 디렉토리에서 클론
cd /opt/apps   # 또는 원하는 경로
git clone https://github.com/ahe24/eda_verifyops.git verifyops
cd verifyops
```

### 2.2 의존성 설치

```bash
npm install --production
```

### 2.3 환경변수 설정

```bash
# 템플릿 복사 → 실제 값으로 수정
cp .env.example .env
vi .env
```

**`.env` 필수 수정 항목:**

```bash
# 서버 바인딩 주소
HOST=0.0.0.0

# 포트 (기존 PM2 서비스와 충돌하지 않는 포트로 설정)
PORT=3100          # ← 사용하지 않는 포트를 할당하세요

# 환경
NODE_ENV=production

# PM2 앱 이름
APP_NAME=verifyops-promo
```

> [!WARNING]
> `.env` 파일은 **절대 git에 커밋하지 마세요** (`.gitignore`에 이미 포함됨).

### 2.4 로그 디렉토리 생성

```bash
mkdir -p logs
```

### 2.5 동작 확인 (수동 실행)

```bash
node server.js
# [VerifyOps] Server running → http://0.0.0.0:3100  (production)
# Ctrl+C 로 종료
```

### 2.6 PM2로 서비스 등록

```bash
pm2 start ecosystem.config.js

# 상태 확인
pm2 status

# 로그 확인
pm2 logs verifyops-promo --lines 20

# 서버 재부팅 시 자동 시작 (이미 설정되어 있다면 생략)
pm2 save
pm2 startup   # 안내되는 명령 실행
```

---

## 3단계: Nginx 리버스 프록시 설정 (권장)

기존 PM2 서비스들과 함께 nginx를 사용하고 있다면, 서브도메인 또는 경로로 연결합니다.

### 옵션 A: 서브도메인 방식

```nginx
# /etc/nginx/conf.d/verifyops.conf

server {
    listen 80;
    server_name verifyops.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 옵션 B: 경로 방식 (기존 서버에 추가)

```nginx
# 기존 server 블록 안에 추가

location /verifyops/ {
    proxy_pass http://127.0.0.1:3100/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

```bash
# 설정 검증 및 적용
nginx -t
systemctl reload nginx
```

---

## 4단계: 업데이트 배포 (이후 반복)

### Windows PC에서

```powershell
cd d:\a4_antigravity\eda_dv_toolflow
git add .
git commit -m "fix: 변경 내용 설명"
git push
```

### Rocky Linux 서버에서

```bash
cd /opt/apps/verifyops
git pull origin main
npm install --production   # 의존성 변경 시에만
pm2 restart verifyops-promo
```

> [!TIP]
> 자동화하려면 GitHub Webhooks + 배포 스크립트를 구성할 수 있습니다.

---

## 📁 확장 가이드

### TypeScript 코드 추가 시

```bash
# src/ 디렉토리에 .ts 파일 작성 후:
npm run build        # → dist/ 에 JS 산출물 생성

# server.js에서 dist/ 모듈 import:
# const apiRouter = require('./dist/routes/api');
# app.use('/api', apiRouter);
```

### 추가 웹 앱 (예: 대시보드) 추가 시

```
eda_dv_toolflow/
├── eda_promo/        ← 기존 프로모션 사이트
├── dashboard/        ← 새 프로젝트 (React, Vue 등)
├── src/              ← 백엔드 API (TypeScript)
└── server.js         ← Express에서 마운트
```

```javascript
// server.js 에 추가
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard', 'dist')));
```

---

## 🔧 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `EADDRINUSE: address already in use` | PORT가 다른 서비스와 충돌 | `.env`에서 PORT 변경 |
| PM2에서 앱이 계속 재시작 | 로그 확인 필요 | `pm2 logs verifyops-promo --err --lines 50` |
| `Cannot find module 'dotenv'` | 의존성 미설치 | `npm install --production` 재실행 |
| Git push 시 인증 실패 | GitHub token 만료 | PAT 재발급 또는 SSH key 등록 |
| 브라우저에서 접근 불가 | 방화벽 차단 | `firewall-cmd --add-port=3100/tcp --permanent && firewall-cmd --reload` |
