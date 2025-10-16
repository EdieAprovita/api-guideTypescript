#!/usr/bin/env python3
"""
Script to update swagger.yaml with standardized review endpoints.
This script adds new /{id}/reviews paths while keeping legacy /add-review paths.
"""

from pathlib import Path

def update_swagger():
    swagger_path = Path('swagger.yaml')
    with open(swagger_path, 'r') as f:
        content = f.read()
    
    # Define mapping of resources to update
    # Format: (legacy_path, new_path, resource_name)
    updates = [
        ('businesses/add-review/{id}', 'businesses/{id}/reviews', 'Businesses', 'Business'),
        ('restaurants/add-review/{id}', 'restaurants/{id}/reviews', 'Restaurants', 'Restaurant'),
        ('doctors/add-review/{id}', 'doctors/{id}/reviews', 'Doctors', 'Doctor'),
        ('markets/add-review/{id}', 'markets/{id}/reviews', 'Markets', 'Market'),
        ('recipes/add-review/{id}', 'recipes/{id}/reviews', 'Recipes', 'Recipe'),
        ('sanctuaries/add-review/{id}', 'sanctuaries/{id}/reviews', 'Sanctuaries', 'Sanctuary'),
        ('professions/add-review/{id}', 'professions/{id}/reviews', 'Professions', 'Profession'),
    ]
    
    for legacy, new, resource_plural, resource_singular in updates:
        legacy_pattern = f"  /{legacy}:"
        new_pattern = f"  /{new}:"
        
        # Generate proper Swagger definition
        new_path_def = f"""  /{new}:
    post:
      tags:
      - {resource_plural}
      summary: Add Review to {resource_singular} (Standardized)
      parameters:
      - in: path
        name: id
        required: true
        schema:
          type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                rating:
                  type: integer
                  minimum: 1
                  maximum: 5
                comment:
                  type: string
                  maxLength: 1000
                name:
                  type: string
              required:
              - rating
              - comment
      responses:
        '201':
          description: Review created successfully
          content:
            application/json:
              schema:
                type: object
      security:
      - bearerAuth: []
"""
        
        # Only add if doesn't already exist
        if new_pattern not in content:
            if legacy_pattern in content:
                content = content.replace(legacy_pattern, new_path_def + legacy_pattern, 1)
                print(f"✅ Added /{new} POST operation")
            else:
                print(f"⚠️  Could not find {legacy_pattern}")
        else:
            print(f"ℹ️  /{new} already exists, skipping")
    
    with open(swagger_path, 'w') as f:
        f.write(content)
    
    print("\n✅ swagger.yaml updated successfully!")

if __name__ == '__main__':
    update_swagger()

