# Power

React + Spring Boot + MySQL 기반 개인 프로젝트 배포용 기본 구조입니다.

## 구조

```text
backend/   Spring Boot API, JPA, MySQL
frontend/  Vite React app
deploy/    EC2 배포 참고 설정
compose.yml Docker Compose 로컬 실행
```

## Docker Compose

프로젝트 루트에서 아래 명령으로 프론트, 백엔드, MySQL을 함께 실행합니다.

```bash
docker compose up
```

백그라운드 실행:

```bash
docker compose up -d
```

종료:

```bash
docker compose down
```

DB 볼륨까지 삭제:

```bash
docker compose down -v
```

접속 주소:

```text
Frontend  http://localhost:9090
Backend   http://localhost:9096/api/health
MySQL     localhost:3308
```

Compose의 MySQL 접속 정보:

```text
host      localhost
port      3308
database  personal_project
username  appuser
password  apppassword
root      rootpassword
```

## Backend

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=local'
```

로컬 백엔드는 기본적으로 `9096` 포트에서 실행됩니다.

```text
http://localhost:9096/api/health
```

기본 환경변수:

```bash
DB_URL='jdbc:mysql://localhost:3306/personal_project?serverTimezone=Asia/Seoul&characterEncoding=UTF-8'
DB_USERNAME=appuser
DB_PASSWORD=change-me
```

API:

```text
GET  /api/health
GET  /api/posts
POST /api/posts
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

로컬 프론트는 고정 포트 `9090`에서 실행됩니다.

```text
http://localhost:9090
```

프로덕션 빌드:

```bash
npm run build
```

EC2에서 Nginx가 같은 도메인의 `/api`를 백엔드로 프록시하므로, 운영 빌드에서는 `VITE_API_BASE_URL`을 비워둡니다.
로컬 개발 서버에서는 Vite proxy가 `/api` 요청을 `http://localhost:9096`으로 전달합니다.

## EC2 배포 메모

EC2에는 `git`, `nginx`, `mysql-server`, `java-17-amazon-corretto-devel`, `nodejs`가 필요합니다.

백엔드:

```bash
cd ~/apps/power/backend
./gradlew clean bootJar -x test
mkdir -p ~/apps/backend
cp build/libs/power-backend.jar ~/apps/backend/app.jar
sudo systemctl restart spring-app
```

프론트:

```bash
cd ~/apps/power/frontend
npm install
npm run build
sudo mkdir -p /var/www/myapp
sudo rm -rf /var/www/myapp/*
sudo cp -r dist/* /var/www/myapp/
sudo systemctl restart nginx
```
