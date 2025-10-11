const SPOT_ICON_MAP: Record<string, string> = {
  "スーパー・ニンテンドー・ワールド™": "/memories/マリオ.jpg",
  "ドンキーコング・エリア": "/memories/ドンキーコング.jpg",
  "ウィザーディング・ワールド・オブ・ハリー・ポッター™": "/memories/ハリポタ.jpg",
  "ホグワーツ城ライティング": "/memories/ホグワーツ.jpg",
  "ミニオン・パーク": "/memories/ミニオン.jpg",
  "ユニバーサル・ワンダーランド": "/memories/ワンダーランド.jpg",
  "ジュラシック・パーク": "/memories/ジュラシックパーク.jpg",
  "ユニバーサル・スタジオ・ジャパン エントランス": "/memories/エントランス.jpg",
  "パーク内レストラン": "/memories/レストラン.jpg",
  "オフィシャルホテル": "/memories/ホテル.svg",
  "万博エントランス": "/memories/万博.png",
  "未来パビリオン": "/memories/パビリオン.jpg",
  "コモンズ館": "/memories/コモンズ.jpg",
  "ランチスポット（万博）": "/memories/レストラン.jpg",
  "モーニングタイム": "/memories/モーニング.AVIF",
  "ショッピング（梅田）": "/memories/ショッピング.jpg",
};

export function resolveSpotIcon(name: string): string | undefined {
  return SPOT_ICON_MAP[name];
}

export function hasSpotIcon(name: string): boolean {
  return Boolean(resolveSpotIcon(name));
}
