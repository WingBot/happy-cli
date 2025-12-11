#!/bin/bash
# Happy Copilot 快速检查脚本
# 用于快速验证开发环境和依赖

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🔍 Happy Copilot Quick Check"
echo "=========================================="
echo ""

# 检查函数
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2 installed"
        if [ ! -z "$3" ]; then
            VERSION=$($3 2>&1 | head -n 1)
            echo -e "  └─ Version: $VERSION"
        fi
        return 0
    else
        echo -e "${RED}✗${NC} $2 not found"
        if [ ! -z "$4" ]; then
            echo -e "  └─ Install: $4"
        fi
        return 1
    fi
}

# 1. Node.js 检查
check_command "node" "Node.js" "node --version" "https://nodejs.org/"

# 2. npm 检查
check_command "npm" "npm" "npm --version"

# 3. yarn 检查 (可选)
check_command "yarn" "yarn (optional)" "yarn --version" "npm install -g yarn"

# 4. GitHub CLI 检查
echo ""
check_command "gh" "GitHub CLI" "gh --version" "https://cli.github.com/"

# 5. GitHub 认证检查
echo ""
echo -n "Checking GitHub authentication... "
if gh auth status &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
    GH_USER=$(gh auth status 2>&1 | grep "Logged in" | sed -n 's/.*as \([^ ]*\).*/\1/p')
    echo -e "  └─ Logged in as: $GH_USER"
else
    echo -e "${RED}✗${NC}"
    echo -e "  └─ Run: ${BLUE}gh auth login${NC}"
fi

# 6. Copilot 扩展检查
echo ""
echo -n "Checking Copilot extension... "
if gh extension list 2>/dev/null | grep -q "gh-copilot"; then
    echo -e "${GREEN}✓${NC}"
    COPILOT_INFO=$(gh extension list | grep "gh-copilot")
    echo -e "  └─ $COPILOT_INFO"
else
    echo -e "${RED}✗${NC}"
    echo -e "  └─ Run: ${BLUE}gh extension install github/gh-copilot${NC}"
fi

# 7. 项目依赖检查
echo ""
echo -n "Checking project dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC}"
    echo -e "  └─ node_modules exists"
else
    echo -e "${RED}✗${NC}"
    echo -e "  └─ Run: ${BLUE}npm install${NC}"
fi

# 8. 构建检查
echo ""
echo -n "Checking if project is built... "
if [ -d "dist" ]; then
    echo -e "${GREEN}✓${NC}"
    echo -e "  └─ dist/ exists"
else
    echo -e "${YELLOW}!${NC} Not built"
    echo -e "  └─ Run: ${BLUE}npm run build${NC}"
fi

# 9. 测试文件检查
echo ""
echo -n "Checking Copilot source files... "
if [ -f "src/copilot/types.ts" ] && [ -f "src/copilot/utils/authChecker.ts" ]; then
    echo -e "${GREEN}✓${NC}"
    FILE_COUNT=$(find src/copilot -name "*.ts" | wc -l)
    echo -e "  └─ Found $FILE_COUNT TypeScript files"
else
    echo -e "${RED}✗${NC}"
    echo -e "  └─ Copilot source files missing"
fi

# 总结
echo ""
echo "=========================================="
echo "📊 Summary"
echo "=========================================="

# 计算就绪状态
READY=true

if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    READY=false
    echo -e "${RED}⚠ Node.js/npm not installed${NC}"
fi

if ! command -v gh &> /dev/null; then
    READY=false
    echo -e "${YELLOW}⚠ GitHub CLI not installed (optional for testing)${NC}"
fi

if ! gh auth status &> /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ GitHub not authenticated (optional for testing)${NC}"
fi

if [ ! -d "node_modules" ]; then
    READY=false
    echo -e "${RED}⚠ Dependencies not installed${NC}"
fi

echo ""
if [ "$READY" = true ]; then
    echo -e "${GREEN}✅ Ready for development!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run tests: ${BLUE}npm test${NC}"
    echo "  2. Build: ${BLUE}npm run build${NC}"
    echo "  3. Run Phase 1 tests: ${BLUE}./scripts/test-phase1.sh${NC}"
else
    echo -e "${YELLOW}⚡ Setup incomplete${NC}"
    echo ""
    echo "Please install missing dependencies first"
fi

echo ""
