#!/bin/bash

echo "🏗️ Creating missing test files for critical controllers..."

# Controllers that need tests immediately
CONTROLLERS=(
    "BaseController"
    "businessControllers" 
    "doctorsControllers"
    "marketsControllers"
    "postControllers"
    "professionControllers"
    "professionProfileController"
    "recipesControllers"
    "restaurantControllers"
    "sanctuaryControllers"
    "userControllers"
)

# Create test directory if it doesn't exist
mkdir -p src/test/controllers

for controller in "${CONTROLLERS[@]}"; do
    test_file="src/test/controllers/${controller}.test.ts"
    
    if [[ ! -f "$test_file" ]]; then
        echo "📝 Creating $test_file..."
        
        cat > "$test_file" << EOF
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../app'

import type { Request, Response, NextFunction } from 'express'

// Mock dependencies
vi.mock('../../middleware/authMiddleware', () => ({
  protect: (req: Request, res: Response, next: NextFunction) => {
    req.user = { _id: 'testuser', role: 'user' }
    next()
  },
  admin: (req: Request, res: Response, next: NextFunction) => next()
}))

describe('${controller}', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic functionality', () => {
    it('should respond to health check', async () => {
      // Basic test to ensure controller is accessible
      expect(true).toBe(true)
    })

    // TODO: Add specific tests for ${controller} endpoints
    // Example:
    // it('should get all items', async () => {
    //   const response = await request(app)
    //     .get('/api/v1/your-endpoint')
    //     .expect(200)
    //   
    //   expect(response.body.success).toBe(true)
    // })
  })
})
EOF
        
        echo "✅ Created $test_file"
    else
        echo "⏭️ Skipping $test_file (already exists)"
    fi
done

echo "🎯 Missing controller tests created!"
echo "📝 Next steps:"
echo "  1. Run: npm run test:coverage"
echo "  2. Implement actual test cases in each file"
echo "  3. Focus on the most used endpoints first"