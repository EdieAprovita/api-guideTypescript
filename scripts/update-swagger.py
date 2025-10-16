#!/usr/bin/env python3
"""
Script to update swagger.yaml with standardized review endpoints.
This script adds new /{id}/reviews paths while keeping legacy /add-review paths.
"""

import re
from pathlib import Path

def update_swagger():
    swagger_path = Path('swagger.yaml')
    with open(swagger_path, 'r') as f:
        content = f.read()
    
    # Define mapping of resources to update
    # Format: (legacy_path, new_path, description_suffix)
    updates = [
        ('businesses/add-review/{id}', 'businesses/{id}/reviews', 'Businesses'),
        ('restaurants/add-review/{id}', 'restaurants/{id}/reviews', 'Restaurants'),
        ('doctors/add-review/{id}', 'doctors/{id}/reviews', 'Doctors'),
        ('recipes/add-review/{id}', 'recipes/{id}/reviews', 'Recipes'),
        ('sanctuaries/add-review/{id}', 'sanctuaries/{id}/reviews', 'Sanctuaries'),
        ('professions/add-review/{id}', 'professions/{id}/reviews', 'Professions'),
    ]
    
    # For each update, find the legacy path definition and add a new standardized path before it
    # BUT ONLY if the new path doesn't already exist
    for legacy, new, resource in updates:
        legacy_pattern = f"  /{legacy}:"
        new_pattern = f"  /{new}:"
        new_path_def = f"""  /{new}:
    post:
      tags:
      - {resource}
      summary: Add Review to {resource} (Standardized)
      requestBody:
        content:
          application/json:
            schema:
              type: object
              example:
                rating: 5
                comment: Excellent!
                name: User Name
      responses:
        '200':
          description: Successful response
          content:
            application/json: {{}}
"""
        
        # Check if new path already exists
        if new_pattern not in content:
            # Insert new path before legacy path
            if legacy_pattern in content:
                content = content.replace(legacy_pattern, new_path_def + legacy_pattern, 1)
                print(f"✅ Added /{new} (before /{legacy})")
            else:
                print(f"⚠️  Could not find {legacy_pattern}")
        else:
            print(f"ℹ️  /{new} already exists, skipping (has GET/POST)")
    
    with open(swagger_path, 'w') as f:
        f.write(content)
    
    print("\n✅ swagger.yaml updated successfully!")

if __name__ == '__main__':
    update_swagger()

