#!/bin/bash
# MySQL Database Setup Script for Laundry Buddy
# Run this with: sudo bash backend/scripts/setup-mysql.sh

echo "🔧 Setting up MySQL for Laundry Buddy..."

# Create database
mysql -e "CREATE DATABASE IF NOT EXISTS laundry_buddy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "✅ Database 'laundry_buddy' created"

# Create user
mysql -e "CREATE USER IF NOT EXISTS 'laundry_user'@'localhost' IDENTIFIED BY 'LaundryBuddy@2024';"
echo "✅ User 'laundry_user' created"

# Grant privileges
mysql -e "GRANT ALL PRIVILEGES ON laundry_buddy.* TO 'laundry_user'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo "✅ Privileges granted"

echo ""
echo "🎉 MySQL setup complete!"
echo ""
echo "📝 Update your backend/.env file with:"
echo "   DB_HOST=localhost"
echo "   DB_PORT=3306"
echo "   DB_USER=laundry_user"
echo "   DB_PASSWORD=LaundryBuddy@2024"
echo "   DB_NAME=laundry_buddy"
echo ""
echo "🚀 Then start the server with: npm run dev"
