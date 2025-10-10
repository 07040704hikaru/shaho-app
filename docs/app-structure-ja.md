# アプリ構成ガイド

旅のサプライズ体験アプリの構成を日本語でまとめたドキュメントです。ディレクトリ構造、主要ファイルの役割、データモデリング、提供機能を一括で把握できます。

## ディレクトリ構成

```
src/
  app/              Next.js App Router（サーバー側エントリとグローバルスタイル）
    globals.css
    layout.tsx
    page.tsx
  components/       クライアントコンポーネント（UIロジック）
    MemoryGallery.tsx
    TripExperience.tsx
    TripMap.tsx
  data/             データ取得ユーティリティ
    tripPlan.ts
  lib/              共通ライブラリ（Prisma クライアント）
    prisma.ts
prisma/             Prisma スキーマとシード
  schema.prisma
  seed.ts
public/memories/    アルバム用プレースホルダー画像
```

## 主要ファイルの役割

- `src/app/page.tsx` — サーバーコンポーネント。Prisma から旅データを読み込み、`TripExperience` に渡します。
- `src/app/layout.tsx` — アプリ全体の HTML ルートとメタ情報を定義します。
- `src/app/globals.css` — 全ページで共有するデザインスタイル。
- `src/components/TripExperience.tsx` — 体験全体を司るクライアントコンポーネント。タイムライン、スポット詳細、ポイント加算、ミッション達成、位置情報の監視を管理します。
- `src/components/TripMap.tsx` — SVG で旅のルートとピンを描画。選択されたスポットを通知します。
- `src/components/MemoryGallery.tsx` — スポットに紐づく写真一覧を表示します。
- `src/data/tripPlan.ts` — Prisma 結果を UI 用の `TripPlan` 形へ整形し、`getTripPlan` で取得します。
- `src/lib/prisma.ts` — PrismaClient のシングルトン生成とキャッシュ。
- `prisma/schema.prisma` — データベースのスキーマ定義。
- `prisma/seed.ts` — シードスクリプト。USJ+万博の誕生日旅行データを挿入します（ミッション／ポイント込み）。

## 位置情報ロジック

- 位置情報の監視 (`navigator.geolocation.watchPosition`) は `TripExperience` 内の `useEffect` で実装されています。
- 取得した座標をもとに解放済みスポットを判定し、距離計算は同ファイル内の `distanceInMeters` 関数で行います。
- 手動解放のトグルや UI 更新、ポイント加算も `TripExperience` が一括で管理しています。

## ER 図（テキスト表現）

```
Trip (1) ───< (n) Spot ───< (n) Photo
                       └───< (n) Mission
```

- `Trip`：旅全体。`slug` でユニークに識別。
- `Spot`：Trip に紐づく各訪問スポット。解放条件やメッセージ、マップ座標、到着ポイントを保持。
- `Photo`：Spot ごとのアルバム写真。表示順を `orderIndex` で管理。
- `Mission`：スポットで実行するタスク。種類（フォト／チェックイン／クエスト）と達成ポイント、補足テキストを保持。

## データ構造の詳細

### Trip
- `slug`: URL や取得キーに利用。
- `title`, `subtitle`, `dedication`, `tripDates`, `baseLocation`, `heroImage`: ヒーローセクション向けの文言とビジュアル。
- `giver`, `receiver`: 誰から誰への旅かを表示。
- `soundtrackUrl`: 任意。旅のプレイリストリンク。

### Spot
- `orderIndex`: タイムライン表示順。
- `name`, `dayLabel`, `dateLabel`, `time`: 画面に表示される見出し情報。
- `location`, `address`, `note`: 実際に訪れる場所と当日の指示。
- `lat`, `lng`: GPS 判定に使う緯度経度。
- `mapX`, `mapY`: SVG マップ上でのピン位置（0〜100 の相対座標）。
- `unlockRadiusMeters`: 指定距離以内に入ると自動解放。
- `headline`, `memoryBody`, `prompt`, `message`: 思い出カードと手紙メッセージ。
- `arrivalPoints`: スポット到着時に自動加算されるポイント。
- `missions`: チャレンジの配列。各要素に種類、説明、ポイント、写真撮影の補助テキストなどを含む。

### Photo
- `imageUrl`: `public/memories` 配下のパス。
- `alt`, `caption`: アクセシビリティと説明文。
- `orderIndex`: 表示順（小さいほど先頭）。

### Mission
- `title`, `description`: ミッションの概要と達成条件。
- `type`: `"PHOTO" | "CHECKIN" | "QUEST"` のいずれか。UI 表示やアイコンの切り替えに利用。
- `rewardPoints`: 達成時に加算されるポイント。
- `photoPrompt`, `checklistLabel`: 表示用の補足テキスト。写真の構図ヒントやチェックボタンのラベルに使用。

## アプリでできること

- 旅の概要・スケジュールをヒーローセクションとタイムラインで見せる。
- 現在地（GPS）との距離でスポットを自動解放。許可が無い場合は手動シミュレート可能。
- 各スポットでメッセージカード、思い出テキスト、質問、写真ギャラリーを表示。
- SVG マップで旅のルートと進捗を可視化。解放時は光のエフェクトと紙吹雪アニメーションが再生される。
- 到着ポイントとミッション達成ポイントを合算し、スコアボードで旅の進行度をリアルタイムに確認。
- Prisma/PostgreSQL で旅・スポット・写真・ミッションを管理し、`prisma/seed.ts` で簡単に初期データを差し替え可能。
- プレイリスト URL を設定して、移動中の BGM リンクを用意。
