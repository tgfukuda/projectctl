#!/usr/bin/env bash
# install.sh
# ---------------------------------------------
# GitHub Release にアップロードされたスタンドアロン
# バイナリ(projectctl-<platform>) をダウンロードし、
# /usr/local/bin (書き込めない場合は ~/bin) に配置する。
#   $ curl -sSL https://raw.githubusercontent.com/yourusername/projectctl/main/install.sh | bash
# またはタグを指定:  VERSION=v0.0.3 INSTALL_DIR=~/bin bash install.sh
# ---------------------------------------------
set -euo pipefail

OWNER="yourusername"   # TODO: GitHub ユーザ名/組織名に置き換える
REPO="projectctl"

# 1. 対象バージョンの決定 -------------------------------------------
TAG="${VERSION:-latest}"
if [[ "$TAG" == latest ]]; then
  API_URL="https://api.github.com/repos/${OWNER}/${REPO}/releases/latest"
else
  API_URL="https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}"
fi

# 2. プラットフォーム判定 -------------------------------------------
unameOut="$(uname -s)" || unameOut="unknown"
case "${unameOut}" in
  Linux*)   PLATFORM="linux" ;;
  Darwin*)  PLATFORM="macos" ;;
  MINGW*|MSYS*|CYGWIN*) PLATFORM="win.exe" ;;
  *) echo "❌ サポート外の OS です: ${unameOut}" ; exit 1 ;;
esac
ASSET_NAME="projectctl-${PLATFORM}"

# 3. Release 情報取得 -------------------------------------------------
RELEASE_JSON="$(mktemp)"
curl -sSL "$API_URL" -o "$RELEASE_JSON"

# 4. アセット URL 抽出 -------------------------------------------------
if command -v jq >/dev/null 2>&1; then
  ASSET_URL="$(jq -r --arg NAME "$ASSET_NAME" '.assets[] | select(.name==$NAME) | .browser_download_url' "$RELEASE_JSON")"
else
  # jq が無い場合は grep で簡易抽出 (最初の一致を採用)
  ASSET_URL="$(grep -oE "https:[^"]+${ASSET_NAME}" "$RELEASE_JSON" | head -n1)"
fi
rm -f "$RELEASE_JSON"

if [[ -z "$ASSET_URL" ]]; then
  echo "❌ ${ASSET_NAME} が Release に見つかりません (tag=${TAG})." >&2
  exit 1
fi

echo "⬇️  ダウンロード: $ASSET_URL"
TMP_BIN="$(mktemp)"
curl -L "$ASSET_URL" -o "$TMP_BIN"
chmod +x "$TMP_BIN"

# 5. インストール先決定 ---------------------------------------------
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"
if [[ ! -w "$INSTALL_DIR" ]]; then
  echo "🔒  ${INSTALL_DIR} への書き込み権限がありません。~/bin にインストールします。"
  INSTALL_DIR="$HOME/bin"
  mkdir -p "$INSTALL_DIR"
fi

mv "$TMP_BIN" "$INSTALL_DIR/projectctl"

echo "✅  インストール完了: $INSTALL_DIR/projectctl"

echo "バージョン: $( "$INSTALL_DIR/projectctl" --version || true )"

# 6. PATH への追加案内 ----------------------------------------------
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
  echo "⚠️  PATH に ${INSTALL_DIR} が含まれていません。シェル設定に追加してください。"
fi
