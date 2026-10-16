#!/bin/sh
# Instalador de uma linha do SIA (macOS e Linux).
#   curl -fsSL https://raw.githubusercontent.com/Sling-Solucoes-de-Mercado/sia-framework/main/install.sh | sh
# Baixa o executável `sia` da última versão, guarda em ~/.sia/bin e instala o SIA na pasta atual.
# Variáveis opcionais:
#   SIA_VERSION=v1.0.0     versão específica (padrão: a mais recente)
#   SIA_INSTALL_DIR=...    onde guardar o executável (padrão: ~/.sia/bin)
#   SIA_SKIP_PROJECT=1     só baixa o executável, sem instalar na pasta atual
# Argumentos extras vão para `sia install` (ex.: ... | sh -s -- --yes --ide claude-code).
set -eu

REPO="Sling-Solucoes-de-Mercado/sia-framework"
VERSION="${SIA_VERSION:-latest}"
INSTALL_DIR="${SIA_INSTALL_DIR:-$HOME/.sia/bin}"

case "$(uname -s)" in
  Darwin) os="macos" ;;
  Linux) os="linux" ;;
  *) echo "Sistema não suportado: $(uname -s). No Windows, use install.ps1." >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64 | amd64) arch="x64" ;;
  arm64 | aarch64) arch="arm64" ;;
  *) echo "Arquitetura não suportada: $(uname -m)." >&2; exit 1 ;;
esac

name="sia-$os-$arch"
if [ "$VERSION" = "latest" ]; then
  base="https://github.com/$REPO/releases/latest/download"
else
  base="https://github.com/$REPO/releases/download/$VERSION"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT INT TERM

echo "SIA: baixando $name ($VERSION)..."
curl -fsSL "$base/$name.tar.gz" -o "$tmp/$name.tar.gz"
if curl -fsSL "$base/SHA256SUMS" -o "$tmp/SHA256SUMS" 2>/dev/null; then
  expected="$(grep " $name.tar.gz\$" "$tmp/SHA256SUMS" | cut -d' ' -f1)"
  if command -v sha256sum >/dev/null 2>&1; then actual="$(sha256sum "$tmp/$name.tar.gz" | cut -d' ' -f1)"; else actual="$(shasum -a 256 "$tmp/$name.tar.gz" | cut -d' ' -f1)"; fi
  if [ -n "$expected" ] && [ "$expected" != "$actual" ]; then echo "Checksum não confere para $name.tar.gz." >&2; exit 1; fi
fi

tar -xzf "$tmp/$name.tar.gz" -C "$tmp"
mkdir -p "$INSTALL_DIR"
mv "$tmp/$name" "$INSTALL_DIR/sia"
chmod +x "$INSTALL_DIR/sia"
echo "SIA: executável em $INSTALL_DIR/sia"

case ":$PATH:" in
  *":$INSTALL_DIR:"*) ;;
  *) echo "Dica: adicione ao PATH para usar 'sia' em qualquer pasta:"; echo "  echo 'export PATH=\"$INSTALL_DIR:\$PATH\"' >> ~/.zshrc  # ou ~/.bashrc" ;;
esac

if [ "${SIA_SKIP_PROJECT:-}" != "1" ]; then
  # Só usa o terminal para as perguntas quando ele realmente abre (em CI ou script, instala com padrões).
  if (: </dev/tty) 2>/dev/null; then
    "$INSTALL_DIR/sia" install "$@" </dev/tty
  else
    "$INSTALL_DIR/sia" install --yes "$@"
  fi
fi
