# Backend Requirements: Connected Teachers Data

## Overview
The ConnectedTeachersList component requires complete teacher information to enable proper navigation to teacher catalogs. Currently, the component lacks access to the teacher's `invitation_code` which is essential for navigation.

## Current Implementation Issues

### Problem
- `currentPlayer.teacher` object is incomplete
- Missing `invitation_code` field required for `/portal/{code}` navigation
- Component has fallback logic but navigation may fail without proper invitation codes

### Current Data Structure
```javascript
currentPlayer: {
  teacher_id: "user_123",
  teacher: {
    id: "user_123",
    name: "John Doe",
    // Missing invitation_code and other needed fields
  }
}
```

## Required Backend Changes

### 1. Add `teachers` Array Field to Player Response

**Endpoint**: `/players/me` (and related player endpoints)

**New Structure**:
```javascript
currentPlayer: {
  teacher_id: "user_123", // Keep for backward compatibility
  teacher: { /* legacy single teacher object */ }, // Keep for backward compatibility

  // NEW: Array of connected teachers (future-ready for multiple connections)
  teachers: [
    {
      id: "user_123",                    // Teacher's user ID
      full_name: "John Doe",             // Teacher's display name
      name: "John",                      // Teacher's short name (fallback)
      invitation_code: "ABC12345",       // REQUIRED: Teacher's invitation code
      email: "john.doe@school.com",      // Non-sensitive contact info
      subject: "Mathematics",            // Teacher's subject/specialty (optional)
      school: "Example School",          // School name (optional)
      // Add other non-sensitive fields as needed
    }
  ]
}
```

### 2. Database Query Changes

**Current Query** (likely):
```sql
SELECT players.*, users.name as teacher_name
FROM players
LEFT JOIN users ON players.teacher_id = users.id
```

**Required Query**:
```sql
SELECT players.*,
       json_agg(
         json_build_object(
           'id', users.id,
           'full_name', users.full_name,
           'name', users.name,
           'invitation_code', users.invitation_code,
           'email', users.email,
           'subject', users.profile->>'subject'
         )
       ) as teachers
FROM players
LEFT JOIN users ON players.teacher_id = users.id
WHERE users.id IS NOT NULL
GROUP BY players.id
```

### 3. Security Considerations

**Include Only Non-Sensitive Fields**:
- ✅ `id`, `full_name`, `name`, `invitation_code`, `email`
- ✅ `subject`, `school`, `profile` data that's public
- ❌ `password_hash`, `reset_tokens`, `private_notes`
- ❌ `firebase_uid`, `internal_admin_notes`

### 4. Implementation Steps

1. **Update Player Model/Service**:
   - Add `teachers` field to player serialization
   - Include proper JOIN with Users table
   - Filter sensitive User fields

2. **Update API Response**:
   - Ensure `/players/me` includes new `teachers` array
   - Maintain backward compatibility with existing `teacher` field

3. **Test Data**:
   ```javascript
   // Example response after implementation
   {
     "id": "player_456",
     "display_name": "Student Name",
     "teacher_id": "user_123",
     "teacher": { /* legacy format */ },
     "teachers": [
       {
         "id": "user_123",
         "full_name": "Jane Smith",
         "name": "Jane",
         "invitation_code": "TEACH001",
         "email": "jane.smith@school.edu",
         "subject": "Science"
       }
     ]
   }
   ```

## Frontend Benefits After Implementation

1. **Proper Navigation**: Links to `/portal/TEACH001` will work correctly
2. **Better UX**: Display teacher's real name and subject
3. **Future Ready**: Support multiple teacher connections seamlessly
4. **Error Prevention**: No more broken links due to missing invitation codes

## Migration Strategy

1. **Phase 1**: Add `teachers` field alongside existing `teacher` field
2. **Phase 2**: Frontend uses `teachers` array, falls back to `teacher` if needed
3. **Phase 3** (future): Remove legacy `teacher` field once all clients updated

## Detailed API Specification

### Affected Endpoints

**Primary Endpoint**: `GET /api/players/me`
**Secondary Endpoints**:
- `GET /api/players/:id` (for admin views)
- `POST /api/players/assign-teacher` (ensure response includes updated data)
- `PUT /api/players/:id` (for profile updates)

### Response Format Standard

```javascript
// SUCCESS Response (200 OK)
{
  "success": true,
  "data": {
    "id": "player_456",
    "display_name": "Student Name",
    "privacy_code": "STUD123",
    "teacher_id": "user_123", // Legacy field
    "teacher": { /* legacy teacher object */ }, // Legacy field
    "teachers": [ // NEW: Primary field for UI consumption
      {
        "id": "user_123",
        "full_name": "Dr. Jane Smith",
        "name": "Jane",
        "invitation_code": "TEACH001", // CRITICAL: Must be present and valid
        "email": "jane.smith@school.edu",
        "subject": "Computer Science",
        "school": "Lincoln High School",
        "profile_image": "/api/files/profile_123.jpg", // Optional
        "created_at": "2024-01-15T10:30:00Z",
        "connection_date": "2024-03-20T14:15:00Z" // When player connected to this teacher
      }
    ],
    "updated_at": "2024-11-27T15:30:00Z"
  }
}

// ERROR Response (404, 500, etc.)
{
  "success": false,
  "error": {
    "message": "Player not found",
    "code": "PLAYER_NOT_FOUND"
  }
}
```

## Field Validation Rules

### Teachers Array Validation
```javascript
teachers: [
  {
    id: {
      type: 'string',
      required: true,
      format: 'mongodb_objectid' // Validate ObjectId format
    },
    full_name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true // Remove HTML/script tags
    },
    name: {
      type: 'string',
      required: false,
      maxLength: 50,
      fallback: 'extract_first_name(full_name)'
    },
    invitation_code: {
      type: 'string',
      required: true,
      format: /^[A-Z0-9]{8}$/, // 8 chars, A-Z and 0-9
      unique: true // Must be unique across all teachers
    },
    email: {
      type: 'string',
      required: false,
      format: 'email',
      sanitize: true
    },
    subject: {
      type: 'string',
      required: false,
      maxLength: 100,
      sanitize: true
    },
    school: {
      type: 'string',
      required: false,
      maxLength: 200,
      sanitize: true
    }
  }
]
```

## Backend Implementation Guide

### 1. Sequelize Model Updates

```javascript
// models/Player.js
const Player = sequelize.define('Player', {
  // ... existing fields
}, {
  // Add virtual field for teachers
  virtual: {
    teachers: {
      get() {
        return this.getTeachers(); // Implement association method
      }
    }
  }
});

// Add association
Player.belongsTo(User, {
  as: 'teacher',
  foreignKey: 'teacher_id',
  include: ['invitation_code', 'full_name', 'name', 'email', 'profile']
});
```

### 2. Service Layer Implementation

```javascript
// services/PlayerService.js
class PlayerService {
  static async getPlayerWithTeachers(playerId) {
    const player = await Player.findByPk(playerId, {
      include: [{
        model: User,
        as: 'teacher',
        attributes: [
          'id',
          'full_name',
          'name',
          'invitation_code',
          'email',
          'profile', // JSON field
          'created_at'
        ],
        required: false
      }]
    });

    if (!player) {
      throw new Error('Player not found');
    }

    // Transform teacher data into teachers array
    const teachersArray = [];
    if (player.teacher) {
      teachersArray.push({
        id: player.teacher.id,
        full_name: player.teacher.full_name,
        name: player.teacher.name || player.teacher.full_name?.split(' ')[0],
        invitation_code: player.teacher.invitation_code,
        email: player.teacher.email,
        subject: player.teacher.profile?.subject || null,
        school: player.teacher.profile?.school || null,
        connection_date: player.updated_at // When teacher was assigned
      });
    }

    return {
      ...player.toJSON(),
      teachers: teachersArray
    };
  }
}
```

### 3. Controller Updates

```javascript
// controllers/PlayerController.js
const getMe = async (req, res) => {
  try {
    const playerId = req.player.id;
    const playerData = await PlayerService.getPlayerWithTeachers(playerId);

    ludlog.auth('Player data requested:', { playerId });

    res.json({
      success: true,
      data: playerData
    });
  } catch (error) {
    luderror.auth('Error fetching player data:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch player data',
        code: 'PLAYER_FETCH_ERROR'
      }
    });
  }
};
```

## Performance Considerations

### 1. Database Optimizations

```sql
-- Add indexes for better query performance
CREATE INDEX idx_players_teacher_id ON players(teacher_id);
CREATE INDEX idx_users_invitation_code ON users(invitation_code);
CREATE INDEX idx_players_updated_at ON players(updated_at);

-- Ensure invitation_code uniqueness
ALTER TABLE users ADD CONSTRAINT uk_users_invitation_code UNIQUE (invitation_code);
```

### 2. Caching Strategy

```javascript
// Cache teacher data for 15 minutes (teachers don't change frequently)
const TEACHER_CACHE_TTL = 15 * 60; // 15 minutes

const getCachedTeacher = async (teacherId) => {
  const cacheKey = `teacher:${teacherId}`;
  let teacher = await cache.get(cacheKey);

  if (!teacher) {
    teacher = await User.findByPk(teacherId, {
      attributes: ['id', 'full_name', 'name', 'invitation_code', 'email', 'profile']
    });

    if (teacher) {
      await cache.set(cacheKey, teacher, TEACHER_CACHE_TTL);
    }
  }

  return teacher;
};
```

## Error Handling Specifications

### Edge Cases to Handle

1. **Missing Invitation Code**:
   ```javascript
   if (!teacher.invitation_code) {
     luderror.auth('Teacher missing invitation_code:', { teacherId });
     // Include teacher but mark as incomplete
     teacher._incomplete = true;
   }
   ```

2. **Invalid Invitation Code Format**:
   ```javascript
   const INVITATION_CODE_REGEX = /^[A-Z0-9]{8}$/;
   if (!INVITATION_CODE_REGEX.test(teacher.invitation_code)) {
     luderror.auth('Invalid invitation_code format:', {
       teacherId,
       invitation_code: teacher.invitation_code
     });
   }
   ```

3. **Teacher User Deleted**:
   ```javascript
   if (player.teacher_id && !teacher) {
     ludlog.auth('Teacher user deleted, cleaning up player reference:', {
       playerId,
       deletedTeacherId: player.teacher_id
     });
     // Consider auto-cleanup or marking as orphaned
   }
   ```

## Testing Requirements

### 1. Unit Tests

```javascript
// tests/services/PlayerService.test.js
describe('PlayerService.getPlayerWithTeachers', () => {
  it('should return player with teachers array when teacher exists', async () => {
    // Setup
    const player = await Player.create({ display_name: 'Test Student' });
    const teacher = await User.create({
      full_name: 'Test Teacher',
      invitation_code: 'TEACH123',
      email: 'test@teacher.com'
    });
    await player.update({ teacher_id: teacher.id });

    // Execute
    const result = await PlayerService.getPlayerWithTeachers(player.id);

    // Assert
    expect(result.teachers).toHaveLength(1);
    expect(result.teachers[0]).toMatchObject({
      id: teacher.id,
      full_name: 'Test Teacher',
      invitation_code: 'TEACH123',
      email: 'test@teacher.com'
    });
  });

  it('should return empty teachers array when no teacher assigned', async () => {
    const player = await Player.create({ display_name: 'Test Student' });
    const result = await PlayerService.getPlayerWithTeachers(player.id);
    expect(result.teachers).toEqual([]);
  });
});
```

### 2. Integration Tests

```javascript
// tests/api/players.test.js
describe('GET /api/players/me', () => {
  it('should return player data with teachers array', async () => {
    const response = await request(app)
      .get('/api/players/me')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: expect.any(String),
        teachers: expect.any(Array)
      }
    });

    if (response.body.data.teachers.length > 0) {
      expect(response.body.data.teachers[0]).toMatchObject({
        id: expect.any(String),
        full_name: expect.any(String),
        invitation_code: expect.stringMatching(/^[A-Z0-9]{8}$/)
      });
    }
  });
});
```

## Migration Plan

### Phase 1: Backend Implementation (Week 1)
- [ ] Update Player model with teachers association
- [ ] Implement PlayerService.getPlayerWithTeachers()
- [ ] Update /api/players/me endpoint
- [ ] Add database indexes
- [ ] Write unit tests

### Phase 2: Testing & Validation (Week 1)
- [ ] Integration testing
- [ ] Performance testing with caching
- [ ] Security audit of exposed fields
- [ ] Documentation updates

### Phase 3: Deployment & Monitoring (Week 2)
- [ ] Deploy to staging environment
- [ ] Frontend integration testing
- [ ] Production deployment
- [ ] Monitor API performance and error rates

### Phase 4: Future Enhancements (Future)
- [ ] Multiple teacher connections support
- [ ] Teacher-student relationship metadata
- [ ] Advanced teacher permissions
- [ ] Teacher grouping/subjects

## Monitoring and Logging

### Required Logging
```javascript
// Log teacher data requests
ludlog.auth('Player teachers data requested:', {
  playerId,
  teacherCount: teachers.length,
  hasInvitationCodes: teachers.every(t => t.invitation_code)
});

// Log missing invitation codes
if (teachers.some(t => !t.invitation_code)) {
  luderror.auth('Teachers missing invitation codes:', {
    playerId,
    teachersWithoutCodes: teachers.filter(t => !t.invitation_code).map(t => t.id)
  });
}
```

### Metrics to Track
- Teacher data fetch response times
- Missing invitation_code occurrences
- Cache hit rates for teacher data
- API error rates for /players/me

## Backward Compatibility Guarantee

### Legacy Support Promise
1. **Existing `teacher` field**: Keep for 6 months minimum
2. **Existing `teacher_id` field**: Keep permanently (used for relationships)
3. **API response format**: New `teachers` array added without breaking existing fields
4. **Client migration**: Gradual - old clients continue working while new clients use new format

### Deprecation Timeline
- **Month 1-3**: Both `teacher` and `teachers` fields present
- **Month 4-6**: `teacher` field marked as deprecated in docs
- **Month 7+**: Consider removing `teacher` field (with announcement)

## Security Checklist

- [ ] Only non-sensitive User fields included in response
- [ ] SQL injection prevention in queries
- [ ] Input sanitization for all text fields
- [ ] Rate limiting on /players/me endpoint
- [ ] Authentication required for all player endpoints
- [ ] Audit logging for sensitive operations

## Priority: **CRITICAL**
This is blocking proper navigation functionality in the ConnectedTeachersList component and affects core user experience.

**Estimated Implementation Time**: 3-5 days
**Testing Time**: 2-3 days
**Total Timeline**: 1 week

## Success Criteria

✅ **Frontend can navigate to teacher catalogs using invitation codes**
✅ **No broken links due to missing teacher data**
✅ **Future-ready for multiple teacher connections**
✅ **Backward compatible with existing implementations**
✅ **Performance impact < 50ms on /players/me endpoint**
✅ **All tests passing with >90% coverage**