// Node.jsでアイコンを生成するスクリプト
// 使い方: node create-icons-script.js

const fs = require('fs');

// SVGからPNGへの変換が必要な場合は、以下のパッケージを使用
// npm install sharp
//
// しかし、このプロジェクトは単一HTMLファイルで動作するため、
// ブラウザで generate-icons.html を開いてアイコンをダウンロードする方が簡単です。

console.log('アイコンを生成するには、以下の手順を実行してください：');
console.log('');
console.log('1. ブラウザで generate-icons.html を開く');
console.log('2. ボタンをクリックして icon-192.png と icon-512.png をダウンロード');
console.log('3. ダウンロードしたファイルをプロジェクトのルートディレクトリに配置');
console.log('');
console.log('または、以下のコマンドでSVGをPNGに変換できます：');
console.log('');
console.log('  npm install -g sharp-cli');
console.log('  npx sharp -i icon.svg -o icon-192.png resize 192 192');
console.log('  npx sharp -i icon.svg -o icon-512.png resize 512 512');
