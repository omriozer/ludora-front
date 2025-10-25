# School Components Documentation

## SchoolModal Component

A reusable modal component for school add/edit operations that can be used across the application.

### Features

- **Reusable**: Can be used in any component that needs school add/edit functionality
- **Accessible**: Includes proper ARIA attributes and keyboard navigation
- **Customizable**: Supports custom title, width, and height
- **User-friendly**: Handles escape key, backdrop clicks, and prevents background scrolling
- **Hebrew RTL**: Fully supports Hebrew text and RTL layout

### Usage

```jsx
import SchoolModal from '@/components/schools/SchoolModal';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const handleSaveSchool = async (schoolData) => {
    try {
      if (editingSchool) {
        await School.update(editingSchool.id, schoolData);
      } else {
        await School.create(schoolData);
      }
      setIsModalOpen(false);
      setEditingSchool(null);
      // Refresh data or show success message
    } catch (error) {
      console.error('Error saving school:', error);
      // Handle error
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSchool(null);
  };

  return (
    <div>
      {/* Your component content */}
      <Button onClick={() => setIsModalOpen(true)}>
        Add School
      </Button>

      <SchoolModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        school={editingSchool}
        onSave={handleSaveSchool}
        currentUser={currentUser}
      />
    </div>
  );
}
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | ✅ | - | Whether the modal is open |
| `onClose` | `function` | ✅ | - | Function to call when modal should close |
| `school` | `object\|null` | ✅ | - | School data for editing (null for adding new) |
| `onSave` | `function` | ✅ | - | Function to call when school is saved |
| `currentUser` | `object` | ✅ | - | Current user object for admin features |
| `title` | `string` | ❌ | Auto-generated | Custom title for the modal |
| `maxWidth` | `string` | ❌ | `'max-w-2xl'` | Custom max width Tailwind class |
| `maxHeight` | `string` | ❌ | `'max-h-[90vh]'` | Custom max height Tailwind class |

### Examples

#### Basic Usage (Add New School)
```jsx
<SchoolModal
  isOpen={showAddModal}
  onClose={() => setShowAddModal(false)}
  school={null}
  onSave={handleSaveSchool}
  currentUser={currentUser}
/>
```

#### Edit Existing School
```jsx
<SchoolModal
  isOpen={showEditModal}
  onClose={() => setShowEditModal(false)}
  school={selectedSchool}
  onSave={handleSaveSchool}
  currentUser={currentUser}
/>
```

#### Custom Title and Size
```jsx
<SchoolModal
  isOpen={showModal}
  onClose={handleClose}
  school={school}
  onSave={handleSave}
  currentUser={currentUser}
  title="עריכת פרטי מוסד החינוך"
  maxWidth="max-w-4xl"
  maxHeight="max-h-[95vh]"
/>
```

### Keyboard Navigation

- **Escape Key**: Closes the modal
- **Tab/Shift+Tab**: Navigate between form fields
- **Enter**: Submit form (when focus is on submit button)

### Accessibility Features

- **ARIA attributes**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- **Focus management**: Focus is trapped within the modal
- **Screen reader support**: Proper labeling and structure
- **Keyboard navigation**: Full keyboard accessibility

### Integration Points

The SchoolModal component integrates with:

1. **SchoolForm Component**: The actual form UI and validation
2. **School Entity Service**: For API calls (`School.create()`, `School.update()`)
3. **User Authentication**: For admin-only features
4. **Toast System**: For success/error notifications (handled by parent component)

### Future Enhancements for School Subscriptions

This reusable modal can be extended for school subscription management:

```jsx
// Example: Adding subscription management to the modal
<SchoolModal
  isOpen={showModal}
  onClose={handleClose}
  school={school}
  onSave={handleSave}
  currentUser={currentUser}
  title="ניהול מנויים למוסד חינוך"
  showSubscriptions={true} // Future prop
  onSubscriptionChange={handleSubscriptionChange} // Future prop
/>
```

### File Structure

```
src/components/schools/
├── SchoolModal.jsx          # Reusable modal wrapper
├── SchoolForm.jsx           # Form component
└── README.md                # This documentation
```

### Dependencies

- React (hooks: useState, useEffect)
- SchoolForm component
- Tailwind CSS for styling
- School entity service