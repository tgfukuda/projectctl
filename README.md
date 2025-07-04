# projectctl

プロジェクト毎に必要なブラウザタブ・アプリケーション・エディタを一括で起動／停止し、状態を管理する CLI ツールです。開発やタスク切り替え時の「環境準備」をワンコマンドで自動化できます。

## 特長

* YAML でプロジェクトと URL / 作業ディレクトリ / 起動コマンドを宣言
* `projectctl start <name>` でブラウザ・エディタ・任意アプリを同時起動
* `projectctl stop  <name>` で関連プロセスをまとめて終了
* `projectctl list` で登録済みプロジェクトを一覧表示
* スタンドアロンバイナリを提供 (Linux / macOS / Windows)
* Node.js ランタイムが無くても利用可能

## インストール

### 1. リリースバイナリ (推奨)

```bash
# 最新版をインストール (curl | bash)
curl -sSL https://raw.githubusercontent.com/yourusername/projectctl/main/install.sh | bash

# 指定バージョンをインストール
VERSION=v0.0.3 curl -sSL https://raw.githubusercontent.com/yourusername/projectctl/main/install.sh | bash
```
- インストール先は `/usr/local/bin` (書込不可の場合 `~/bin`)。
- PATH に追加されていない場合は警告が表示されます。

### 2. npm (Node18 以上が必要)

```bash
npm install -g projectctl
```

### 3. ソースからビルド

```bash
git clone https://github.com/yourusername/projectctl.git
cd projectctl
npm ci
npm run build            # dist 生成
npm run pkg              # スタンドアロンバイナリを生成
```

## 使い方

```bash
# プロジェクトを起動
projectctl start your-project-name

# プロジェクトを停止 (強制終了オプション付き)
projectctl stop your-project-name --force

# 登録済みプロジェクトを表示
projectctl list

# 設定ファイルを編集
projectctl edit

# 設定ファイルを検証
projectctl validate
```

### 設定ファイル

デフォルトの設定パスは `~/.projectctl/projects.yaml` です。例:

```yaml
projects:
  - name: example
    urls:
      - https://example.com
      - https://github.com
    workdir: ~/workspace/example
    apps:
      - "code ~/workspace/example"
    tabBehavior: restore   # restore | clean
```

* `urls`        – 起動時に開くタブ
* `workdir`     – エディタで開く作業ディレクトリ
* `apps`        – 起動する任意コマンド
* `tabBehavior` – セッション復元ポリシー (`restore`: 前回タブ復元, `clean`: 新規)

詳細は Wiki を参照してください。

## コントリビュート

1. Issue / PR は歓迎です (日本語 OK)
2. `npm run lint` で ESLint チェック、`npm run format` で Prettier 整形
3. main ブランチへのマージで GitHub Actions がテスト & バイナリ生成

## ライセンス

ISC License

## 作者

@yourusername
