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

const SPOT_MEMORY_PHOTO_MAP: Record<string, string> = {
  "スーパー・ニンテンドー・ワールド™": "/memories/HEIFtoJPEG/IMG_0406.jpg",
  "ドンキーコング・エリア": "/memories/HEIFtoJPEG/IMG_0490.jpg",
  "ウィザーディング・ワールド・オブ・ハリー・ポッター™": "/memories/HEIFtoJPEG/IMG_1127.jpg",
  "ホグワーツ城ライティング": "/memories/HEIFtoJPEG/img-1890-2.jpg",
  "ミニオン・パーク": "/memories/HEIFtoJPEG/IMG_2644.jpg",
  "ユニバーサル・ワンダーランド": "/memories/HEIFtoJPEG/IMG_4856.jpg",
  "ジュラシック・パーク": "/memories/HEIFtoJPEG/img-5923-2.jpg",
  "ユニバーサル・スタジオ・ジャパン エントランス": "/memories/HEIFtoJPEG/IMG_7501.jpg",
  "パーク内レストラン": "/memories/HEIFtoJPEG/IMG_7618.jpg",
  "オフィシャルホテル": "/memories/HEIFtoJPEG/IMG_8644.jpg",
  "万博エントランス": "/memories/HEIFtoJPEG/IMG_8990.jpg",
  "未来パビリオン": "/memories/HEIFtoJPEG/img-0490-2.jpg",
  "コモンズ館": "/memories/HEIFtoJPEG/IMG_0493.jpg",
  "ランチスポット（万博）": "/memories/HEIFtoJPEG/img-1876-2.jpg",
  "モーニングタイム": "/memories/HEIFtoJPEG/IMG_2035.jpg",
  "ショッピング（梅田）": "/memories/HEIFtoJPEG/IMG_2682.jpg",
};

export function resolveSpotMemoryPhoto(name: string): string | undefined {
  return SPOT_MEMORY_PHOTO_MAP[name];
}
