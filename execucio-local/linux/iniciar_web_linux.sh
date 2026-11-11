#!/usr/bin/env bash
# ==============================================================================
# Iniciador intel·ligent i automàtic de la web del curs a Linux / macOS
# Comprova si Quarto està instal·lat; si no hi és, l'instal·la tot sol
# (via paquet .deb a Debian/Ubuntu o brew a macOS), aixeca el servidor i obre la web.
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}==================================================================${NC}"
echo -e "  SISTEMES OPERATIUS (UdL - Campus Igualada)"
echo -e "  Iniciador automàtic i intel·ligent del servidor local"
echo -e "${CYAN}==================================================================${NC}\n"

# 1. Detectar si Quarto ja està disponible
if ! command -v quarto &> /dev/null; then
    echo -e "${YELLOW}[!] Quarto no s'ha trobat al sistema.${NC}"
    echo -e "${CYAN}[*] Iniciant instal·lació automàtica de Quarto...${NC}"

    OS_NAME="$(uname -s)"
    if [ "$OS_NAME" = "Linux" ]; then
        # Detectar gestor de paquets a Linux
        if command -v apt-get &> /dev/null; then
            echo -e "    -> Detectada distribució Debian/Ubuntu. Descarregant .deb oficial..."
            TEMP_DEB="/tmp/quarto-linux-amd64.deb"
            curl -fSL "https://github.com/quarto-dev/quarto-cli/releases/download/v1.6.42/quarto-1.6.42-linux-amd64.deb" -o "$TEMP_DEB"
            echo -e "    -> Instal·lant paquet Quarto..."
            sudo dpkg -i "$TEMP_DEB" || sudo apt-get install -f -y
            rm -f "$TEMP_DEB"
        elif command -v dnf &> /dev/null; then
            echo -e "    -> Detectada distribució Fedora/RHEL. Instal·lant via rpm..."
            TEMP_RPM="/tmp/quarto-linux-amd64.rpm"
            curl -fSL "https://github.com/quarto-dev/quarto-cli/releases/download/v1.6.42/quarto-1.6.42-linux-amd64.tar.gz" -o "/tmp/quarto.tar.gz"
            sudo tar -xzf /tmp/quarto.tar.gz -C /opt
            sudo ln -sf /opt/quarto-*/bin/quarto /usr/local/bin/quarto
        else
            echo -e "    -> Descarregant binaris tar.gz universals per a Linux..."
            curl -fSL "https://github.com/quarto-dev/quarto-cli/releases/download/v1.6.42/quarto-1.6.42-linux-amd64.tar.gz" -o "/tmp/quarto.tar.gz"
            sudo mkdir -p /opt/quarto
            sudo tar -xzf /tmp/quarto.tar.gz -C /opt/quarto --strip-components=1
            sudo ln -sf /opt/quarto/bin/quarto /usr/local/bin/quarto
            rm -f /tmp/quarto.tar.gz
        fi
    elif [ "$OS_NAME" = "Darwin" ]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo -e "    -> Instal·lant via Homebrew..."
            brew install --cask quarto
        else
            echo -e "    -> Descarregant instal·lador .pkg oficial..."
            curl -fSL "https://github.com/quarto-dev/quarto-cli/releases/download/v1.6.42/quarto-1.6.42-macos.pkg" -o "/tmp/quarto.pkg"
            sudo installer -pkg /tmp/quarto.pkg -target /
            rm -f /tmp/quarto.pkg
        fi
    fi

    # Comprovació final després d'instal·lar
    if ! command -v quarto &> /dev/null; then
        echo -e "${RED}[X] No s'ha pogut completar la instal·lació automàtica.${NC}"
        echo -e "${YELLOW}Pots instal·lar-lo des de: https://quarto.org/docs/get-started/${NC}"
        exit 1
    fi
    echo -e "${GREEN}[OK] Quarto s'ha instal·lat correctament!${NC}"
fi

# 2. Localitzar arrel del projecte
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo -e "${GREEN}[OK] Quarto detectat:${NC} $(quarto --version)"
echo -e "${GREEN}[*] Directori del curs:${NC} ${REPO_ROOT}"
echo -e "${CYAN}[*] Iniciant el servidor local i obrint el teu navegador...${NC}"
echo -e "${YELLOW}[*] Prem CTRL + C per aturar el servidor.${NC}\n"

cd "${REPO_ROOT}"
quarto preview
