# plan-wallet-front 계획 (React Native)

## 목표
plan-wallet 백엔드 API와 연동되는 iOS/Android 가계부 앱 UI/UX를 구축한다.

## 범위
- 인증: 로그인/토큰 재발급
- 사용자: 회원가입/내 정보
- 카테고리: 목록/추가/수정/삭제
- 거래: 목록/추가/수정/삭제
- 통계: 월간 합계/전월 비교/카테고리 합계

---

## 1. 기술 스택
- React Native (TypeScript)
- 상태관리: Zustand (간단/실용)
- 네트워크: Axios
- 네비게이션: React Navigation
- 폼/검증: React Hook Form + Zod
- 날짜: Day.js
- 차트(통계): react-native-svg + chart lib (ex. react-native-chart-kit)

---

## 2. 프로젝트 구조
- `src`
  - `app` (navigation, entry)
  - `screens` (Login, SignUp, Home, Category, Transaction, Stats)
  - `components` (공통 UI)
  - `features` (domain별 로직)
  - `services` (API, axios, token)
  - `stores` (zustand 상태)
  - `utils` (formatters, validators)
  - `assets`

---

## 3. 화면/흐름
1. Auth
- Login 화면
- SignUp 화면
- Refresh 토큰 갱신

2. Main
- 홈: 요약(이번 달 합계)
- 거래 목록
- 거래 추가/수정

3. Category
- 카테고리 목록
- 카테고리 추가/수정/삭제

4. Stats
- 월간 합계
- 전월 비교
- 카테고리별 합계

---

## 4. API 연동 계획
- `/plan/auth/login`
- `/plan/auth/refresh`
- `/plan/users`
- `/plan/users/me`
- `/plan/categories`
- `/plan/transactions`
- `/plan/stats/monthly`
- `/plan/stats/monthly/compare`
- `/plan/stats/categories`

---

## 5. 개발 순서
1. 프로젝트 생성 + 기본 구조
2. 네비게이션/레이아웃 공통화
3. Auth 기능 (로그인/가입/토큰 저장)
4. Category CRUD
5. Transaction CRUD
6. Stats 화면/차트
7. 안정화(에러 처리, 로딩, 빈 상태)

---

END
