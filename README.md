# 社会保険・税対応 給与計算アプリ (Next.js + Prisma)

TypeScript・Next.js (App Router) と Prisma を用いて、以下の社会保険・税関連機能を再現するための土台を用意しました。

- 従業員基礎情報: 標準報酬月額、被保険者区分、扶養家族、税情報、マイナンバー、資格履歴
- 保険料計算: 健康保険・厚生年金・介護保険・雇用保険・労災保険の料率管理と本人/会社負担額算出
- 税額計算: 源泉所得税（月額表・賞与税率）、住民税特別徴収の処理
- 給与計算ロジックとの連携: 支給項目／控除項目から総支給・差引支給額を試算
- 月変・算定サポート: 月次スナップショットと標準報酬月額の判定 UI（月額変更届/算定基礎届の基準確認）
- 源泉税・住民税の可視化: 税額表シミュレーターと住民税特別徴収スケジューラ
- 届出・帳票出力の足がかり: ReportQueueItem で電子申請や PDF 生成に拡張可

## セットアップ

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

環境変数 `DATABASE_URL` に PostgreSQL の接続文字列を設定してください。

## ディレクトリ構成

- `prisma/schema.prisma`: 社保・税ドメインをカバーするモデリング
- `src/lib/calculations/`: 社会保険計算と税額計算のサービス層
- `src/app/api/payroll/calculate`: 給与シミュレーション用 API
- `src/app/employees`: 従業員マスタ UI
- `src/app/payroll`: 給与シミュレーターと計算履歴 UI
- `src/app/insurance/standard-remuneration`: 標準報酬月額の判定ツール
- `src/app/tax/brackets`: 源泉所得税表の可視化・シミュレーション
- `src/app/tax/resident`: 住民税特別徴収スケジュール管理

## 今後の拡張ポイント

- 料率テーブル・税額表の最新値の投入とメンテナンス UI
- 算定基礎 / 月額変更届ロジックの実装
- 電子申請フォーマットや帳票出力サービスの追加
- Prisma によるドメインサービス層を整備してテストしやすくする
- 実行ログ、通知、承認ワークフローの整備

## 注意点

- ネットワークアクセス制限のため、このリポジトリには依存パッケージをインストールしていません。`package.json` を元にローカルで `npm install` を実行してください。
- 税額表・保険料計算ロジックは概算モデルです。実運用時は最新の法令値を投入し、端数調整等を確認してください。
