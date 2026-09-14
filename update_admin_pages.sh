#!/bin/bash

# List of admin pages to update
pages=(
  "app/admin/(protege)/page.tsx"
  "app/admin/(protege)/formateurs/page.tsx"
  "app/admin/(protege)/modules/page.tsx"
  "app/admin/(protege)/configuration/page.tsx"
  "app/admin/(protege)/ressources/page.tsx"
  "app/admin/(protege)/sessions/page.tsx"
  "app/admin/(protege)/visites/page.tsx"
)

for page in "${pages[@]}"; do
  if [ -f "$page" ]; then
    # Check if already has AdminLayout
    if ! grep -q "AdminLayout" "$page"; then
      echo "Updating: $page"
      # Add import at top
      sed -i "1s/^/import { AdminLayout } from '@\/components\/AdminLayout'\n/" "$page"
      # Wrap return statement (simplified - just adds div)
      sed -i "s/return (/return (<AdminLayout><div className=\"max-w-7xl mx-auto\">/" "$page"
      sed -i "s/return (<AdminLayout><div className=\"max-w-7xl mx-auto\">/return (<AdminLayout><div className=\"max-w-7xl mx-auto space-y-6\">/" "$page"
      sed -i "s/)$/<\/div><\/AdminLayout>)/" "$page"
    fi
  fi
done

echo "Done updating admin pages"
