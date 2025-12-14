# クイックスタートガイド

## すぐに始める（3ステップ）

### 1️⃣ ローカルサーバーを起動

**Pythonを使う場合:**
```bash
python -m http.server 8000
```

**Node.jsを使う場合:**
```bash
npx serve
```

**VS Codeを使う場合:**
Live Server拡張機能をインストールして、index.htmlを右クリック → "Open with Live Server"

### 2️⃣ ブラウザで開く

ブラウザで以下にアクセス：
```
http://localhost:8000
```

### 3️⃣ 使い始める

1. **設定ページ**（画面下の⚙️）でカードを登録
2. **支出ページ**（画面下の💸）で支出を記録
3. **ホーム**（画面下の📊）でダッシュボードを確認

## デモデータで試す

1. 画面下の「⚙️ 設定」をタップ
2. 「データをインポート」をタップ
3. `demo-data.json` を選択

これで、サンプルのカードと支出データが読み込まれます！

## iPhoneにインストール

### Safari（iOS）の場合

1. Safariでアプリを開く
2. 画面下の共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」をタップ
4. 「追加」をタップ

これで、ホーム画面にアプリアイコンが追加されます！

### Chrome（Android）の場合

1. Chromeでアプリを開く
2. メニュー（⋮）→「ホーム画面に追加」
3. 「追加」をタップ

## トラブルシューティング

### アイコンが表示されない

1. `generate-icons.html` をブラウザで開く
2. ボタンをクリックして `icon-192.png` と `icon-512.png` をダウンロード
3. ダウンロードしたファイルをプロジェクトのルートに配置
4. `manifest.json` を以下のように編集：

```json
"icons": [
  {
    "src": "icon-192.png",
    "sizes": "192x192",
    "type": "image/png"
  },
  {
    "src": "icon-512.png",
    "sizes": "512x512",
    "type": "image/png"
  }
]
```

### データが消えた

ブラウザのLocalStorageにデータが保存されています。
ブラウザのキャッシュをクリアするとデータが失われます。

**対策：**
- 定期的に「設定」→「データをエクスポート」でバックアップを作成
- エクスポートしたJSONファイルを安全な場所に保存

### 通知が来ない

1. ブラウザの通知権限を確認
2. iOSの場合、ホーム画面に追加後に有効になります
3. 「設定」→「通知を有効にする」をタップ

## 次のステップ

詳しい使い方は [README.md](README.md) をご覧ください。

## GitHub Pagesで公開

```bash
# 1. GitHubリポジトリを作成
# 2. ファイルをプッシュ
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ユーザー名/リポジトリ名.git
git push -u origin main

# 3. Settings → Pages → Source を main ブランチに設定
```

公開URL: `https://ユーザー名.github.io/リポジトリ名/`

## 楽しんでください！

質問や問題があれば、README.mdを確認してください。
