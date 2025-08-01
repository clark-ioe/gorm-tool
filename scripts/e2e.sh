#!/usr/bin/env bash

# GORM VSCode Extension - End-to-End Test Script
# This script runs comprehensive tests for the GORM LSP extension

set -e

echo "🚀 Starting GORM Extension E2E Tests..."

# Set up test environment
export CODE_TESTS_PATH="$(pwd)/client/out/test"
export CODE_TESTS_WORKSPACE="$(pwd)/client/testFixture"

# Build the extension
echo "📦 Building extension..."
npm run compile

# Run the test suite
echo "🧪 Running test suite..."
node "$(pwd)/client/out/test/runTest"

echo "✅ All tests completed successfully!"

echo "🎉 GORM Extension E2E Tests Completed!"
echo ""
echo "📊 Test Summary:"
echo "  ✅ Extension compilation"
echo "  ✅ GORM tag validation tests"
echo "  ✅ Diagnostic tests"
echo "  ✅ Completion tests"
echo ""
echo "🔍 Manual Testing Steps:"
echo "  1. Open VSCode with F5 (Launch Extension)"
echo "  2. Open examples/user.go"
echo "  3. Modify GORM tags to see diagnostics"
echo "  4. Test auto-completion in gorm tags"
echo "  5. Verify error highlighting and messages"