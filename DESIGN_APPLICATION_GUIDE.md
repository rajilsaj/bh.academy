# Confidency OS Design Application Guide

## Quick Start

### 1. Import AdminLayout in Your Page

```tsx
import { AdminLayout } from '@/components/AdminLayout'

export default function Page() {
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Your content here */}
      </div>
    </AdminLayout>
  )
}
```

### 2. Use Design System Classes

```tsx
// Cards
<div className="ds-card">Content</div>

// Buttons
<button className="ds-button-primary">Primary</button>
<button className="ds-button-danger">Delete</button>
<button className="ds-button-warning">Warning</button>

// Badges
<span className="ds-badge-critical">Critical</span>
<span className="ds-badge-warning">Warning</span>
<span className="ds-badge-success">Success</span>

// Forms
<input className="ds-input" />
<select className="ds-select"></select>

// Tables
<table className="ds-table">
  <th>Header</th>
  <td>Cell</td>
</table>
```

## Pages to Update

### Priority 1 (High Impact)
- [ ] `/admin` - Dashboard (main page)
- [ ] `/admin/utilisateurs` - Learners (already started)
- [ ] `/admin/(protege)/page.tsx` - Protected area

### Priority 2 (Core Pages)
- [ ] `/admin/(protege)/modules`
- [ ] `/admin/(protege)/formateurs`
- [ ] `/admin/(protege)/tableau-de-bord`

### Priority 3 (Supporting Pages)
- [ ] Settings pages
- [ ] Form pages
- [ ] Modals and popups

## Design Color System

```
Primary Actions:     #6366f1 (Indigo)
Delete/Critical:     #ef4444 (Red)
Warning/Caution:     #f59e0b (Orange)
Success/Approval:    #10b981 (Green)
Info/Secondary:      #3b82f6 (Blue)

Background:          #f9fafb (Gray-50)
Cards/Content:       #ffffff (White)
Borders:             #e5e7eb (Gray-200)
Text Primary:        #1f2937 (Gray-900)
Text Secondary:      #6b7280 (Gray-600)
```

## Implementation Checklist

### For Each Page:

1. **Import AdminLayout**
   ```tsx
   import { AdminLayout } from '@/components/AdminLayout'
   ```

2. **Wrap Page Content**
   ```tsx
   export default function Page() {
     return (
       <AdminLayout>
         {/* Page content */}
       </AdminLayout>
     )
   }
   ```

3. **Replace Old Styling**
   - Remove `bg-blue-*` classes → Use `ds-button-primary`
   - Remove `bg-gray-50` → Use `ds-card` for containers
   - Remove custom button classes → Use `ds-button-*` variants
   - Use `ds-badge-*` for status indicators

4. **Apply Card Styling**
   ```tsx
   <div className="ds-card">
     <div className="p-6">
       {/* Content with ds-card provides border and shadow */}
     </div>
   </div>
   ```

5. **Update Tables**
   ```tsx
   <table className="ds-table">
     <thead>
       <tr>
         <th>Column</th>
       </tr>
     </thead>
     <tbody>
       <tr>
         <td>Cell</td>
       </tr>
     </tbody>
   </table>
   ```

## Button Variants

### Primary (CTA)
```tsx
<button className="ds-button-primary">Create New</button>
```

### Secondary (Alternative)
```tsx
<button className="ds-button-secondary">Cancel</button>
```

### Danger (Destructive)
```tsx
<button className="ds-button-danger">Delete</button>
```

### Warning (Caution)
```tsx
<button className="ds-button-warning">Proceed with caution</button>
```

## Badge Types

```tsx
<span className="ds-badge-critical">Critical Issue</span>
<span className="ds-badge-warning">Warning</span>
<span className="ds-badge-info">Information</span>
<span className="ds-badge-success">Success</span>
```

## Form Elements

```tsx
<input type="text" className="ds-input" placeholder="Input field" />

<select className="ds-select">
  <option>Option 1</option>
</select>

<div className="ds-form-label">Label</div>
<input className="ds-input" />
```

## Layout Structure

```
┌─────────────────────────────────────────────┐
│           AdminLayout Wrapper               │
├──────────────┬──────────────────────────────┤
│              │                              │
│  Sidebar     │      Header/Topbar           │
│  (Logo,Nav)  ├──────────────────────────────┤
│              │                              │
│              │   Page Content (your page)   │
│              │                              │
│              │   (with ds-card, ds-button  │
│              │    ds-badge, etc.)           │
│              │                              │
└──────────────┴──────────────────────────────┘
```

## File Structure After Update

```
app/admin/
├── layout.tsx (wrap with AdminLayout)
├── page.tsx (dashboard - update design)
├── (protege)/
│   ├── utilisateurs/
│   │   └── page.tsx (DONE - using AdminLayout + SyncMonitor)
│   ├── formateurs/
│   │   └── page.tsx (to update)
│   ├── modules/
│   │   └── page.tsx (to update)
│   └── page.tsx (to update)
└── settings/
    └── page.tsx (to update)

components/
├── AdminLayout.tsx (NEW - main wrapper)
├── SyncMonitor.tsx (NEW - sync dashboard)
├── LearnersList.tsx (has checkboxes - matches design)
├── DocumentUpload.tsx (form - matches design)
└── ... other components
```

## Quick Migration Example

### Before (Old)
```tsx
export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Title</h1>
      <button className="bg-blue-600 text-white px-4 py-2 rounded">Click</button>
    </div>
  )
}
```

### After (Confidency OS)
```tsx
import { AdminLayout } from '@/components/AdminLayout'

export default function Page() {
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Title</h1>
        <button className="ds-button-primary">Click</button>
      </div>
    </AdminLayout>
  )
}
```

## Testing the Design

1. Open page in browser
2. Check:
   - Sidebar appears correctly
   - Header is styled properly
   - Cards have indigo borders and shadows
   - Buttons match purple theme
   - Badges show correct colors
   - Content area has proper padding

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Sidebar not showing on mobile | AdminLayout hides on small screens (add menu toggle if needed) |
| Content overflowing | Wrap in `max-w-7xl mx-auto` |
| Wrong button colors | Use `ds-button-*` classes instead of Tailwind colors |
| Layout feels cramped | Increase padding: `p-6` or `p-8` |
| Text too dark on background | Use text-gray-900 for primary, text-gray-600 for secondary |

## Next Steps

1. ✅ AdminLayout created
2. ✅ Design system CSS ready
3. ✅ SyncMonitor component done
4. ⬜ Apply to all admin pages (in progress)
5. ⬜ Update forms and modals
6. ⬜ Mobile menu toggle (optional)

---

**Start with the high-priority pages and work down the list.**
