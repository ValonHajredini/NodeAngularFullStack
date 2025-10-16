#!/bin/bash

# NodeAngularFullStack Development Setup with tmux
# Creates a split terminal layout for development

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="dev-setup"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if tmux is installed
if ! command -v tmux >/dev/null 2>&1; then
    echo -e "${RED}❌ tmux is not installed.${NC}"
    echo -e "${YELLOW}💡 Install with: brew install tmux${NC}"
    exit 1
fi

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  tmux session '$SESSION_NAME' already exists.${NC}"
    echo ""
    echo "Options:"
    echo "  1) Attach to existing session"
    echo "  2) Kill and create new session"
    echo "  3) Cancel"
    echo ""
    read -p "Choose [1-3]: " choice

    case $choice in
        1)
            echo -e "${GREEN}✅ Attaching to existing session...${NC}"
            tmux attach-session -t "$SESSION_NAME"
            exit 0
            ;;
        2)
            echo -e "${BLUE}🔄 Killing existing session...${NC}"
            tmux kill-session -t "$SESSION_NAME"
            ;;
        *)
            echo -e "${BLUE}❌ Cancelled.${NC}"
            exit 0
            ;;
    esac
fi

echo -e "${BLUE}🚀 Creating tmux development session: $SESSION_NAME${NC}"
echo -e "${BLUE}📂 Working directory: $ROOT_DIR${NC}"
echo ""
echo -e "${GREEN}Layout:${NC}"
echo "┌─────────────────┬─────────────────┐"
echo "│                 │  cd apps/web    │"
echo "│                 │  ng s           │"
echo "│   claude        ├─────────────────┤"
echo "│                 │  cd apps/api    │"
echo "│                 │  npm run dev    │"
echo "└─────────────────┴─────────────────┘"
echo ""

# Create new tmux session (detached)
tmux new-session -d -s "$SESSION_NAME" -c "$ROOT_DIR"

# Rename the first window
tmux rename-window -t "$SESSION_NAME:0" "dev"

# Split the window vertically (left and right columns, 50/50)
tmux split-window -h -t "$SESSION_NAME:0" -c "$ROOT_DIR"

# Split the right column horizontally (top and bottom rows)
tmux split-window -v -t "$SESSION_NAME:0.1" -c "$ROOT_DIR"

# Left pane (pane 0): Run claude command
tmux send-keys -t "$SESSION_NAME:0.0" "claude" C-m

# Top-right pane (pane 1): Navigate to apps/web and start Angular dev server
tmux send-keys -t "$SESSION_NAME:0.1" "cd apps/web && ng s" C-m

# Bottom-right pane (pane 2): Navigate to apps/api and start backend dev server
tmux send-keys -t "$SESSION_NAME:0.2" "cd apps/api && npm run dev" C-m

# Set the focus to the left pane (claude)
tmux select-pane -t "$SESSION_NAME:0.0"

echo -e "${GREEN}✅ tmux session created successfully!${NC}"
echo ""
echo -e "${YELLOW}📋 tmux Commands:${NC}"
echo -e "  Detach:     ${BLUE}Ctrl+B${NC} then ${BLUE}D${NC}"
echo -e "  Reattach:   ${BLUE}tmux attach -t $SESSION_NAME${NC}"
echo -e "  Kill:       ${BLUE}tmux kill-session -t $SESSION_NAME${NC}"
echo -e "  Switch pane:${BLUE}Ctrl+B${NC} then arrow keys"
echo -e "  Scroll:     ${BLUE}Ctrl+B${NC} then ${BLUE}[${NC} (q to exit)"
echo ""
echo -e "${GREEN}🚀 Attaching to session...${NC}"

# Attach to the session
tmux attach-session -t "$SESSION_NAME"
