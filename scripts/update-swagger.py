#!/usr/bin/env python3
"""
Script to update swagger.yaml with standardized review endpoints.
This script adds new /{id}/reviews paths while keeping legacy /add-review paths.
Uses ruamel.yaml to preserve comments and formatting.

Requires: ruamel.yaml (pip install ruamel.yaml)
"""

import sys
from pathlib import Path

import sys
try:
    import yaml
except ImportError:
    print("❌ PyYAML is required. Install with: pip install pyyaml")
    sys.exit(1)

def update_swagger():
    swagger_path = Path('swagger.yaml')
    
    # Load YAML as Python data structures (comments and formatting are not preserved)
    with open(swagger_path, 'r') as f:
        swagger = yaml.safe_load(f)
    
    # Define mapping of resources to update
    # Format: (legacy_path, new_path, resource_plural, resource_singular)
    updates = [
        ('businesses/add-review/{id}', 'businesses/{id}/reviews', 'Businesses', 'Business'),
        ('restaurants/add-review/{id}', 'restaurants/{id}/reviews', 'Restaurants', 'Restaurant'),
        ('doctors/add-review/{id}', 'doctors/{id}/reviews', 'Doctors', 'Doctor'),
        ('markets/add-review/{id}', 'markets/{id}/reviews', 'Markets', 'Market'),
        ('recipes/add-review/{id}', 'recipes/{id}/reviews', 'Recipes', 'Recipe'),
        ('sanctuaries/add-review/{id}', 'sanctuaries/{id}/reviews', 'Sanctuaries', 'Sanctuary'),
        ('professions/add-review/{id}', 'professions/{id}/reviews', 'Professions', 'Profession'),
    ]
    
    paths = swagger.get('paths', {})
    
    for legacy_path, new_path, resource_plural, resource_singular in updates:
        legacy_key = f"/{legacy_path}"
        new_key = f"/{new_path}"
        
        # Only add if doesn't already exist
        if new_key not in paths:
            if legacy_key in paths:
                # Create new path definition based on existing legacy path
                
                # Build new POST operation with standardized structure
                new_post_op = {
                    'tags': [resource_plural],
                    'summary': f'Add Review to {resource_singular} (Standardized)',
                    'parameters': [
                        {
                            'in': 'path',
                            'name': 'id',
                            'required': True,
                            'schema': {'type': 'string'}
                        }
                    ],
                    'requestBody': {
                        'required': True,
                        'content': {
                            'application/json': {
                                'schema': {
                                    'type': 'object',
                                    'properties': {
                                        'rating': {
                                            'type': 'integer',
                                            'minimum': 1,
                                            'maximum': 5
                                        },
                                        'comment': {
                                            'type': 'string',
                                            'maxLength': 1000
                                        },
                                        'name': {'type': 'string'}
                                    },
                                    'required': ['rating', 'comment']
                                }
                            }
                        }
                    },
                    'responses': {
                        '201': {
                            'description': 'Review created successfully',
                            'content': {
                                'application/json': {
                                    'schema': {'type': 'object'}
                                }
                            }
                        }
                    },
                    'security': [{'bearerAuth': []}]
                }
                
                # Add new path with the POST operation
                paths[new_key] = {'post': new_post_op}
                print(f"✅ Added {new_key} POST operation")
                
                # Mark legacy path as deprecated
                mark_legacy_deprecated(paths, legacy_key, new_path)
            else:
                print(f"⚠️  Could not find {legacy_key}")
        else:
            print(f"ℹ️  {new_key} already exists, skipping")
    
    # Update the swagger dict
    swagger['paths'] = paths
    
    # Write back to file preserving comments and formatting
    with open(swagger_path, 'w') as f:
        yaml.dump(swagger, f)
    
    print("\n✅ swagger.yaml updated successfully with ruamel.yaml!")

if __name__ == '__main__':
    update_swagger()

