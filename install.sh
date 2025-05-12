#!/usr/bin/env bash
# setup_projectctl_symlink.sh
# -----------------------------------------
# ts-node で実行する TypeScript CLI (index.ts) を
# ~/bin/projectctl という名前でシンボリックリンクし、
# PATH に ~/bin が無ければ .bashrc に追記する簡易セットアップスクリプト。
#
# -----------------------------------------

set -euo pipefail

SOURCE_PATH="$(realpath "$(dirname "$0")/src/index.ts")"

if [[ ! -f "$SOURCE_PATH" ]]; then
  echo "❌  ファイルが見つかりません: $SOURCE_PATH"
  exit 1
fi

# --- 2. ts-node があるか確認 ---------------------------------------------------
if ! command -v ts-node >/dev/null 2>&1; then
  echo "⚠️  ts-node が見つかりません。インストールしますか？ [Y/n]"
  read -r ans
  if [[ "${ans:-Y}" =~ ^[Yy]$ ]]; then
    npm i -g ts-node typescript
  else
    echo "❌  ts-node が無いと実行できません。終了します。"
    exit 1
  fi
fi

# --- 3. 実行権限を付与 ---------------------------------------------------------
chmod +x "$SOURCE_PATH"

# --- 4. ~/bin ディレクトリを確保 ----------------------------------------------
TARGET_DIR="$HOME/bin"
mkdir -p "$TARGET_DIR"

# --- 5. シンボリックリンク作成 (上書き可) --------------------------------------
TARGET_LINK="$TARGET_DIR/projectctl"
ln -sf "$SOURCE_PATH" "$TARGET_LINK"
echo "✅  シンボリックリンク作成: $TARGET_LINK → $SOURCE_PATH"

# --- 6. PATH に ~/bin が含まれているか確認 --------------------------------------
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$TARGET_DIR"; then
  echo "⚠️  PATH に $TARGET_DIR が含まれていません。追加しますか？ [Y/n]"
  read -r ans
  if [[ "${ans:-Y}" =~ ^[Yy]$ ]]; then
    {
      echo
      echo "# projectctl 用に追加"
      echo "export PATH=\"\$HOME/bin:\$PATH\""
    } >> "$HOME/.bashrc"
    echo "✅  ~/.bashrc に PATH を追加しました。新しいシェルを開くか 'source ~/.bashrc' を実行してください。"
  else
    echo "ℹ️  このままだと 'projectctl' コマンドは直接呼び出せません。"
  fi
else
  echo "✅  PATH に $TARGET_DIR が含まれています。"
fi

echo
echo "🎉  セットアップ完了！ 例:  projectctl start dsk"
