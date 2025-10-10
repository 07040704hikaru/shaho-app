# Birthday Travel Album

旅の移動に合わせて写真・メッセージ・スケジュールが解放されていくサプライズ用ウェブアプリです。Next.js (App Router) と Prisma を使い、GPS 判定でスポットを開放する体験を提供します。

## 主な機能

- 旅のハイライトをまとめたヒーローセクションとカスタム SVG ルートマップ
- スポットごとのタイムライン：到着距離に応じて自動で開放、手動シミュレートも可能
- スポットに紐づく思い出メモ、手紙メッセージ、差し替え可能なアルバムギャラリー
- 到着ボーナスとミッション（フォト・チェックイン・クエスト）でポイントが貯まるスコアボード
- Prisma/PostgreSQL を使った旅・スポット・写真・ミッションデータの永続化

## セットアップ

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

環境変数 `DATABASE_URL` に PostgreSQL の接続文字列を設定してください。（例: `.env` に保存）

## Prisma モデル

- `Trip`: 旅全体のメタデータ（タイトル、日程、ヒーロー画像、サウンドトラック URL など）
- `Spot`: 各スポットの時間・場所・メッセージ・地図上の座標・解放距離
- `Photo`: スポットに紐づくアルバム画像（順序・キャプション付き）

初期データは `prisma/seed.ts` で USJ と大阪・関西万博を巡る誕生日旅行が登録されます。写真は `public/memories` 以下の SVG を差し替えるだけで OK です。

## ディレクトリ構成（抜粋）

- `src/app/page.tsx` — Prisma から旅データを読み込み、クライアント体験へ渡すサーバーコンポーネント
- `src/components/TripExperience.tsx` — タイムラインとスポット開放ロジックを担うクライアントコンポーネント
- `src/components/TripMap.tsx` — 旅ルートを描画する SVG マップ
- `src/data/tripPlan.ts` — Prisma から `TripPlan` 型へ整形するユーティリティ
- `src/lib/prisma.ts` — PrismaClient のシングルトン

## データを編集するには

1. `prisma/seed.ts` を編集して `npm run db:seed` を再実行するか、Prisma Studio (`npx prisma studio`) を使って直接レコードを更新します。
2. スポットごとの写真は `public/memories/*.svg`（もしくは任意の画像ファイル）を差し替えてください。
3. 解放判定用の座標 (`lat`, `lng`, `mapX`, `mapY`) と `unlockRadiusMeters` を好みの値に調整します。`arrivalPoints` や各ミッションの `rewardPoints` を変更すればポイントラリーもアレンジできます。

## 開発のヒント

- GPS 許可が得られない場合に備え、タイムラインの「解放をシミュレート」で手動開放を用意しています。
- 旅を追加したい場合は `Trip` を新規作成し、`Mission` や `Photo` を紐づけた上で `slug` を決めて `getTripPlan(slug)` を呼び出すように変更します。
- 写真を実ファイルへ差し替えるときはビルド済みパス（例: `/memories/...`）に合わせてファイル名を統一するのが簡単です。

楽しいサプライズの旅を！
