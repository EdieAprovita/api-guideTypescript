#!/usr/bin/env python3
"""
Script to update swagger.yaml with standardized review endpoints.
This script adds new /{id}/reviews paths while keeping legacy /add-review paths.
Uses ruamel.yaml to preserve comments and formatting.

Requires: ruamel.yaml (pip install ruamel.yaml)
"""

import sys
from pathlib import Path

try:
    from ruamel.yaml import YAML
except ImportError:
    print("❌ ruamel.yaml is required. Install with: pip install ruamel.yaml")
    sys.exit(1)

# Constants for reusable values
APP_JSON = 'application/json'
ERROR_RESPONSE_REF = '#/components/schemas/ErrorResponse'

def build_error_response(description: str) -> dict:
    """Build a standardized error response schema."""
    return {
        'description': description,
        'content': {
            APP_JSON: {
                'schema': {'$ref': ERROR_RESPONSE_REF}
            }
        }
    }

def build_review_post_operation(resource_plural: str, resource_singular: str) -> dict:
    """Build a standardized review POST operation with all error responses."""
    return {
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
                APP_JSON: {
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
                    APP_JSON: {
                        'schema': {'type': 'object'}
                    }
                }
            },
            '400': build_error_response('Bad Request'),
            '401': build_error_response('Unauthorized'),
            '403': build_error_response('Forbidden'),
            '422': build_error_response('Unprocessable Entity')
        },
        'security': [{'bearerAuth': []}]
    }

def mark_legacy_deprecated(paths: dict, legacy_key: str, new_path: str) -> None:
    """Mark legacy operation as deprecated with appropriate summary."""
    if legacy_key in paths and 'post' in paths[legacy_key]:
        paths[legacy_key]['post']['deprecated'] = True
        current_summary = paths[legacy_key]['post'].get('summary', '')
        if 'Legacy' not in current_summary:
            paths[legacy_key]['post']['summary'] = f"{current_summary} (Legacy - Use /{new_path})"
        print(f"✅ Marked {legacy_key} as deprecated")

def update_swagger():
    """Main function to update swagger.yaml with standardized review endpoints."""
    swagger_path = Path('swagger.yaml')
    
    # Use ruamel.yaml with proper configuration to preserve formatting
    yaml = YAML()
    yaml.preserve_quotes = True
    yaml.default_flow_style = None
    yaml.width = 4096  # Prevent line wrapping
    
    # Load YAML preserving comments and formatting
    with open(swagger_path, 'r') as f:
        swagger = yaml.load(f)
    
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
        
        if new_key not in paths:
            if legacy_key in paths:
                # Create and add new standardized path
                new_post_op = build_review_post_operation(resource_plural, resource_singular)
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

