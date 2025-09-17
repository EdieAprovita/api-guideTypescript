#!/bin/bash

# =============================================================================
# SECURE DOCKER ENVIRONMENT SETUP SCRIPT
# =============================================================================
# This script helps you set up secure credentials for Docker Compose
# 
# Usage: 
#   chmod +x scripts/setup-docker-env.sh
#   ./scripts/setup-docker-env.sh
#
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}"
    echo "============================================================================="
    echo "$1"
    echo "============================================================================="
    echo -e "${NC}"
}

# Check if openssl is available
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is required but not installed."
        print_error "Please install OpenSSL first:"
        print_error "  macOS: brew install openssl"
        print_error "  Ubuntu/Debian: apt-get install openssl"
        print_error "  CentOS/RHEL: yum install openssl"
        exit 1
    fi
}

# Check if we're in the right directory
check_directory() {
    if [[ ! -f "docker-compose.yml" ]]; then
        print_error "This script must be run from the project root directory"
        print_error "Make sure you're in the same directory as docker-compose.yml"
        exit 1
    fi
}

# Generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d '\n'
}

# Generate JWT secret
generate_jwt_secret() {
    openssl rand -hex 64 | tr -d '\n'
}

# Main setup function
main() {
    print_header "🔐 SECURE DOCKER ENVIRONMENT SETUP"
    
    # Checks
    check_directory
    check_openssl
    
    # Check if .env.docker already exists
    if [[ -f ".env.docker" ]]; then
        print_warning ".env.docker already exists!"
        echo -n "Do you want to overwrite it? (y/N): "
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_status "Setup cancelled. Existing .env.docker preserved."
            exit 0
        fi
        print_warning "Backing up existing .env.docker to .env.docker.backup"
        cp .env.docker .env.docker.backup
    fi
    
    print_status "Copying .env.docker.example to .env.docker..."
    cp .env.docker.example .env.docker
    
    print_header "🎲 GENERATING SECURE CREDENTIALS"
    
    # Generate all credentials
    print_status "Generating MongoDB password..."
    MONGO_PASSWORD=$(generate_password)
    
    print_status "Generating Redis password..."
    REDIS_PASSWORD=$(generate_password)
    
    print_status "Generating JWT secrets..."
    JWT_SECRET=$(generate_jwt_secret)
    JWT_REFRESH_SECRET=$(generate_jwt_secret)
    
    print_status "Generating development JWT secrets..."
    JWT_SECRET_DEV=$(generate_jwt_secret)
    JWT_REFRESH_SECRET_DEV=$(generate_jwt_secret)
    
    print_header "📝 UPDATING CONFIGURATION FILE"
    
    # Replace placeholders in .env.docker
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/REPLACE_WITH_SECURE_PASSWORD_FROM_OPENSSL/${MONGO_PASSWORD}/g" .env.docker
        sed -i '' "s/REPLACE_WITH_64_CHARACTER_HEX_STRING_FROM_OPENSSL/${JWT_SECRET}/g" .env.docker
        sed -i '' "s/REPLACE_WITH_DIFFERENT_64_CHARACTER_HEX_STRING/${JWT_SECRET_DEV}/g" .env.docker
        sed -i '' "s/REPLACE_WITH_DIFFERENT_64_CHARACTER_HEX_STRING/${JWT_REFRESH_SECRET_DEV}/g" .env.docker
    else
        # Linux
        sed -i "s/REPLACE_WITH_SECURE_PASSWORD_FROM_OPENSSL/${MONGO_PASSWORD}/g" .env.docker
        sed -i "s/REPLACE_WITH_64_CHARACTER_HEX_STRING_FROM_OPENSSL/${JWT_SECRET}/g" .env.docker
        sed -i "s/REPLACE_WITH_DIFFERENT_64_CHARACTER_HEX_STRING/${JWT_SECRET_DEV}/g" .env.docker
        sed -i "s/REPLACE_WITH_DIFFERENT_64_CHARACTER_HEX_STRING/${JWT_REFRESH_SECRET_DEV}/g" .env.docker
    fi
    
    # Handle multiple replacements for Redis and JWT_REFRESH_SECRET
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - Replace the second occurrence for Redis
        sed -i '' "s/REPLACE_WITH_SECURE_PASSWORD_FROM_OPENSSL/${REDIS_PASSWORD}/" .env.docker
        # Replace the second occurrence for JWT_REFRESH_SECRET
        sed -i '' "s/REPLACE_WITH_64_CHARACTER_HEX_STRING_FROM_OPENSSL/${JWT_REFRESH_SECRET}/" .env.docker
    else
        # Linux
        sed -i "s/REPLACE_WITH_SECURE_PASSWORD_FROM_OPENSSL/${REDIS_PASSWORD}/" .env.docker
        sed -i "s/REPLACE_WITH_64_CHARACTER_HEX_STRING_FROM_OPENSSL/${JWT_REFRESH_SECRET}/" .env.docker
    fi
    
    print_header "✅ SETUP COMPLETE!"
    
    print_success "✅ Secure credentials generated and configured"
    print_success "✅ .env.docker file created with random passwords"
    print_success "✅ All placeholders replaced with secure values"
    
    print_header "🚀 NEXT STEPS"
    
    echo -e "${GREEN}Your Docker environment is now ready to use!${NC}"
    echo ""
    echo "Start your services:"
    echo -e "${BLUE}  # Production mode:${NC}"
    echo -e "  docker compose --profile prod up -d"
    echo ""
    echo -e "${BLUE}  # Development mode:${NC}"
    echo -e "  docker compose --profile dev up"
    echo ""
    
    print_header "⚠️  IMPORTANT SECURITY REMINDERS"
    
    print_warning "🔐 Your .env.docker contains sensitive credentials"
    print_warning "🚫 NEVER commit .env.docker to version control"
    print_warning "🔄 Consider rotating these credentials regularly"
    print_warning "👥 Don't share credentials via email or chat"
    
    echo ""
    print_status "🎉 Setup completed successfully!"
}

# Run main function
main "$@"