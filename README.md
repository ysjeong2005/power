# Power

React + Spring Boot + MySQL 기반 개인 프로젝트 배포용 구조입니다.

## 구조

```text
backend/          Spring Boot API, JPA, MySQL
frontend/         Vite React app
compose.yml       Docker Compose 로컬 실행
compose.prod.yml  Docker Compose EC2 배포 실행
```

## Docker Compose - 로컬

로컬에서는 DBeaver 접속과 개발 확인을 위해 MySQL, Backend, Frontend 포트를 모두 호스트에 공개합니다.

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

## Docker Compose - EC2 배포

EC2에서는 `compose.prod.yml`을 사용합니다.

```bash
docker compose -f compose.prod.yml up -d --build
```

배포용 compose는 외부 공개를 최소화합니다.

```text
Frontend  EC2_PUBLIC_IP:9090 공개
MySQL     EC2_PUBLIC_IP:3308 공개
Backend   외부 미공개, Docker 내부에서만 접근
```

DBeaver로 EC2 MySQL에 접속하려면 AWS 보안그룹에서 `3308`을 열어야 합니다. 단, `0.0.0.0/0`이 아니라 접속할 PC의 공인 IP만 허용하세요.

```text
Type        Port  Source
SSH         22    내 IP
Custom TCP  9090  내 IP + 함께 사용할 사람 IP
Custom TCP  3308  내 IP
```

EC2에서 환경값을 바꾸고 싶으면 `.env`를 만들어 사용합니다.

```bash
MYSQL_DATABASE=personal_project
MYSQL_USER=appuser
MYSQL_PASSWORD=강한비밀번호
MYSQL_ROOT_PASSWORD=강한루트비밀번호
MYSQL_PUBLIC_PORT=3308
FRONTEND_PUBLIC_PORT=9090
CORS_ALLOWED_ORIGINS=http://EC2_PUBLIC_IP:9090
```

DBeaver 접속 정보:

```text
host      EC2_PUBLIC_IP
port      3308
database  personal_project
username  appuser
password  .env의 MYSQL_PASSWORD
```

DB 데이터는 Docker volume `mysql-data`에 저장됩니다. 운영 데이터가 들어간 뒤에는 아래 명령은 사용하지 마세요.

```bash
docker compose -f compose.prod.yml down -v
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

EC2에는 `git`, `docker`, `docker compose plugin`만 있으면 됩니다.

```bash
git clone https://github.com/ysjeong2005/power.git
cd power
docker compose -f compose.prod.yml up -d --build
```
