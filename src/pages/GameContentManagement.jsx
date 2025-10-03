
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Word, WordEN, Image, QA, Attribute, ContentList, User, GameContentTag
} from "@/services/entities";
import { ContentTag } from "@/services/entities"; // Added ContentTag entity
import {
  Search, Plus, Edit, Trash2, AlertTriangle, CheckCircle, Calendar,
  Book, Languages, ImageIcon, HelpCircle, PenTool, List,
  Link, ExternalLink, X, Tags, Upload // Added Tags and Upload icons
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UploadFile } from "@/services/integrations";
import { apiRequest } from "@/services/apiClient";
import { ContentRelationship } from "@/services/entities";

import ContentTagManagementModal from '../components/modals/ContentTagManagementModal';
import ImageUploadModal from '../components/modals/ImageUploadModal'; // Added ImageUploadModal import


export default function GameContentManagement() {
  const navigate = useNavigate();

  const [activeEntity, setActiveEntity] = useState('Word');
  const [searchTerm, setSearchTerm] = useState('');
  const [entities, setEntities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [editingEntity, setEditingEntity] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [errors, setErrors] = useState([]);

  // Relationship management states
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityRelationships, setEntityRelationships] = useState([]);
  const [allEntities, setAllEntities] = useState({});
  const [searchEntities, setSearchEntities] = useState('');
  const [potentialMatches, setPotentialMatches] = useState([]);
  const [loadingRelationships, setLoadingRelationships] = useState(false);

  // Add new state for content type selection modal
  const [showContentTypeModal, setShowContentTypeModal] = useState(false);

  // Add new state for image upload modal
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);

  // State for screen size for conditional rendering/styling
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  // Add state for relationship counts per entity
  const [entityRelationshipCounts, setEntityRelationshipCounts] = useState({});

  // Add states for bulk deletion
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteResults, setBulkDeleteResults] = useState(null);

  // State for Tag Management Modal
  const [showTagManagement, setShowTagManagement] = useState(false);

  // Add state for entity tags
  const [entityTags, setEntityTags] = useState({});

  // State for Content Tag Management Modal
  const [showContentTagModal, setShowContentTagModal] = useState(false);
  const [selectedContentForTags, setSelectedContentForTags] = useState(null);


  useEffect(() => {
    // Set initial screen size
    setIsLargeScreen(window.innerWidth >= 768);

    // Add event listener for screen resize
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper functions
  const getEntityClass = useCallback((entityName) => {
    const entityMap = {
      'Word': Word,
      'WordEN': WordEN,
      'Image': Image,
      'QA': QA,
      'Attribute': Attribute,
      'ContentList': ContentList,
      'Rules': null // Rules is not implemented yet
    };
    return entityMap[entityName];
  }, []);

  const getSearchFields = (entity) => {
    switch (activeEntity) {
      case 'Word':
        return [entity.vocalized, entity.word, entity.root];
      case 'WordEN':
        return [entity.word];
      case 'Image':
        return [entity.description, entity.file_url];
      case 'QA':
        // For QA, search question and all correct/incorrect answers
        const qaFields = [entity.question_text];
        if (entity.correct_answers) {
          qaFields.push(...entity.correct_answers.map(ans => ans.answer_text));
        }
        if (entity.incorrect_answers) {
          qaFields.push(...entity.incorrect_answers);
        }
        return qaFields;
      case 'Attribute':
        return [entity.type, entity.value];
      case 'ContentList':
        return [entity.name, entity.description];
      default:
        return [];
    }
  };

  const getEntityIcon = useCallback((entityType) => {
    const icons = {
      'Word': Languages,
      'WordEN': Book,
      'Image': ImageIcon,
      'QA': HelpCircle,
      'Attribute': PenTool,
      'ContentList': List,
      'Rules': PenTool
    };
    return icons[entityType] || Book;
  }, []);

  // Add function to get entity type label
  const getEntityTypeLabel = useCallback((entityType) => {
    const labels = {
      'Word': 'HE',
      'WordEN': 'EN',
      'Image': '🖼️',
      'QA': '❓',
      'Attribute': '🏷️',
      'ContentList': '📋',
      'Rules': '⚙️'
    };
    return labels[entityType] || entityType;
  }, []);

  // Add function to get entity type full name (for messages like "no Words available")
  const getEntityTypeName = useCallback((entityType) => {
    const names = {
      'Word': 'מילים בעברית',
      'WordEN': 'מילים באנגלית',
      'Image': 'תמונות',
      'QA': 'שאלות ותשובות',
      'Attribute': 'תכונות',
      'ContentList': 'רשימות תוכן',
      'Rules': 'כללי משחק'
    };
    return names[entityType] || entityType;
  }, []);

  const getEntityDisplayName = useCallback((entity, entityType) => {
    switch (entityType) {
      case 'Word':
        return entity.vocalized || entity.word;
      case 'WordEN':
        return entity.word;
      case 'Image':
        // Display image URL or emoji if no description, or description if available
        if (entity.description) return entity.description;
        if (entity.file_url) {
          if (entity.file_url.startsWith('http')) {
            return `תמונה (${entity.file_url.substring(0, 30)}...)`;
          } else {
            return `אימוג׳י (${entity.file_url})`;
          }
        }
        return 'תמונה';
      case 'QA':
        const correctCount = entity.correct_answers?.length || 0;
        const incorrectCount = entity.incorrect_answers?.length || 0;
        return `${entity.question_text} (${correctCount} נכונות, ${incorrectCount} שגויות)`;
      case 'Attribute':
        return `${entity.type}: ${entity.value}`;
      case 'ContentList':
        return entity.name;
      default:
        return 'פריט לא מזוהה';
    }
  }, []);

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // Add function to load relationship counts (moved before loadEntities)
  const loadRelationshipCounts = useCallback(async (entitiesList) => {
    try {
      const counts = {};

      for (const entity of entitiesList) {
        // Get relationships where entity is source OR target
        const [sourceRelationships, targetRelationships] = await Promise.all([
          ContentRelationship.filter({
            source_id: entity.id,
            source_type: activeEntity
          }).catch(() => []),
          ContentRelationship.filter({
            target_id: entity.id,
            target_type: activeEntity
          }).catch(() => [])
        ]);

        // Combine relationships and count by target/source type
        const allRelationships = [...sourceRelationships, ...targetRelationships];
        const typeCounts = {};

        allRelationships.forEach(rel => {
          // Filter out custom game word relationships completely
          if (rel.source_type === 'Game' || rel.target_type === 'Game') {
            // Skip all Game relationships to avoid custom words
            return;
          }

          // Determine the "other" entity type
          let otherType;
          if (rel.source_id === entity.id && rel.source_type === activeEntity) {
            otherType = rel.target_type;
          } else {
            otherType = rel.source_type;
          }
          typeCounts[otherType] = (typeCounts[otherType] || 0) + 1;
        });

        counts[entity.id] = typeCounts;
      }

      setEntityRelationshipCounts(counts);
    } catch (error) {
      console.error('Error loading relationship counts:', error);
    }
  }, [activeEntity]);

  // Add function to load entity tags
  const loadEntityTags = useCallback(async (entitiesList) => {
    try {
      const tags = {};

      for (const entity of entitiesList) {
        // Get content tags for this entity
        const contentTags = await ContentTag.filter({
          content_id: entity.id,
          content_type: activeEntity
        }).catch(() => []); // Add catch for robustness

        if (contentTags.length > 0) {
          // Get the actual tag objects
          const tagIds = contentTags.map(ct => ct.tag_id);
          const allTags = await GameContentTag.find().catch(() => []); // Add catch for robustness
          const entityTagObjects = allTags.filter(tag => tagIds.includes(tag.id));
          tags[entity.id] = entityTagObjects;
        } else {
          tags[entity.id] = [];
        }
      }

      setEntityTags(tags);
    } catch (error) {
      console.error('Error loading entity tags:', error);
    }
  }, [activeEntity]);

  const loadEntities = useCallback(async () => {
    setIsLoading(true);
    try {
      let data = [];

      // Special handling for Rules - show "to be developed" message
      if (activeEntity === 'Rules') {
        setEntities([]);
        setIsLoading(false);
        return;
      }

      const EntityClass = getEntityClass(activeEntity);

      if (EntityClass) {
        data = await EntityClass.list('-created_date').catch(() => []); // Add catch for robustness

        // Apply source filter only
        if (sourceFilter !== 'all') {
          data = data.filter(item => item.source === sourceFilter);
        }
      }

      setEntities(data);

      // Load relationship counts for all entities
      await loadRelationshipCounts(data);

      // Load tags for all entities
      await loadEntityTags(data);
    } catch (error) {
      console.error('Error loading entities:', error);
      showMessage('error', 'שגיאה בטעינת הנתונים');
    }
    setIsLoading(false);
  }, [activeEntity, sourceFilter, getEntityClass, showMessage, loadRelationshipCounts, loadEntityTags]);


  // Function to handle opening content tag modal
  const handleOpenContentTagModal = (entity) => {
    setSelectedContentForTags(entity);
    setShowContentTagModal(true);
  };

  // Function to get the appropriate "Add" button text based on active entity
  const getAddButtonText = () => {
    const entityLabels = {
      'Word': 'הוספת מילה בעברית',
      'WordEN': 'הוספת מילה באנגלית',
      'Image': 'הוספת תמונה',
      'QA': 'הוספת שאלה ותשובה',
      'Attribute': 'הוספת תכונה',
      'ContentList': 'הוספת רשימת תוכן'
    };
    return entityLabels[activeEntity] || 'הוסף חדש';
  };

  // Function to handle content type selection
  const handleContentTypeSelect = (entityType) => {
    setActiveEntity(entityType);
    setShowContentTypeModal(false);
    // If Image is selected, open ImageUploadModal, else open general form
    if (entityType === 'Image') {
      setShowImageUploadModal(true);
    } else {
      setShowForm(true);
    }
  };


  // Content type options for the modal
  const contentTypes = [
    { key: 'Word', label: 'מילה בעברית', icon: Languages, description: 'מילים מנוקדות וללא ניקוד בעברית' },
    { key: 'WordEN', label: 'מילה באנגלית', icon: Book, description: 'מילים באנגלית' },
    { key: 'Image', label: 'תמונה', icon: ImageIcon, description: 'תמונות, אימוג׳ים וקבצי מדיה' },
    { key: 'QA', label: 'שאלה ותשובה', icon: HelpCircle, description: 'שאלות ותשובות למשחקים' },
    { key: 'Attribute', label: 'תכונה', icon: PenTool, description: 'תכונות וערכים כמו מגדר, מספר, סוג פעולה' },
    { key: 'ContentList', label: 'רשימות תוכן', icon: List, description: 'רשימות וקבוצות של תכנים' }
  ];


  const filteredEntities = entities.filter(entity => {
    if (!searchTerm) return true;
    const searchFields = getSearchFields(entity);
    return searchFields.some(field =>
      field && field.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredSearchEntities = searchEntities ?
    Object.entries(allEntities).flatMap(([type, entities]) =>
      (entities || [])
        .filter(entity => {
          const displayName = getEntityDisplayName(entity, type);
          return displayName.toLowerCase().includes(searchEntities.toLowerCase());
        })
        .map(entity => ({ ...entity, type }))
    ).slice(0, 20) : [];

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await User.me();

      // Check if user is admin - redirect if not
      if (!user || user.role !== 'admin') {
        navigate('/'); // Redirect to home or login page
        return;
      }

      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
      // Redirect if user not authenticated or API error
      navigate('/'); // Redirect to home or login page
    }
  }, []);

  const loadAllEntities = useCallback(async () => {
    try {
      const allData = {};
      const entityTypes = ['Word', 'WordEN', 'Image', 'QA', 'Attribute', 'ContentList', 'Rules'];

      for (const entityType of entityTypes) {
        // Skip Rules as it's not implemented yet
        if (entityType === 'Rules') {
          allData[entityType] = [];
          continue;
        }

        const EntityClass = getEntityClass(entityType);
        if (EntityClass) {
          try {
            const data = await EntityClass.find().catch(() => []); // Add catch for robustness
            allData[entityType] = data || [];
          } catch (error) {
            console.error(`Error loading ${entityType}:`, error);
            allData[entityType] = [];
          }
        }
      }

      setAllEntities(allData);
    } catch (error) {
      console.error('Error loading all entities:', error);
      // Set fallback data structure
      setAllEntities({
        Word: [],
        WordEN: [],
        Image: [],
        QA: [],
        Attribute: [],
        ContentList: [],
        Rules: []
      });
    }
  }, [getEntityClass, setAllEntities]);

  useEffect(() => {
    loadCurrentUser();
    loadEntities();
    loadAllEntities();
  }, [loadCurrentUser, loadEntities, loadAllEntities]);


  const loadEntityRelationships = async (entity) => {
    setLoadingRelationships(true);
    try {
      // Get relationships where the entity is either source OR target
      const [sourceRelationships, targetRelationships] = await Promise.all([
        ContentRelationship.filter({
          source_id: entity.id,
          source_type: activeEntity
        }).catch(() => []),
        ContentRelationship.filter({
          target_id: entity.id,
          target_type: activeEntity
        }).catch(() => [])
      ]);

      // Combine all relationships but filter out Game relationships completely
      const allRelationships = [...sourceRelationships, ...targetRelationships];
      const filteredRelationships = allRelationships.filter(rel => {
        // Skip all Game relationships to avoid custom words
        if (rel.source_type === 'Game' || rel.target_type === 'Game') {
          return false;
        }
        return true;
      });

      // Remove actual duplicates (same ID)
      const uniqueRelationships = filteredRelationships.filter((rel, index, arr) =>
        arr.findIndex(r => r.id === rel.id) === index
      );

      setEntityRelationships(uniqueRelationships);
      findPotentialMatches(entity);

    } catch (error) {
      console.error('Error loading entity relationships:', error);
      setEntityRelationships([]);
    }
    setLoadingRelationships(false);
  };

  const findPotentialMatches = (entity) => {
    try {
      let matches = [];

      if (activeEntity === 'Word' && entity.word) {
        const englishWords = (allEntities.WordEN || []).filter(w =>
          w.word && entity.word && (
            w.word.toLowerCase().includes(entity.word.toLowerCase()) ||
            entity.word.toLowerCase().includes(w.word.toLowerCase())
          )
        );

        matches = [...matches, ...(englishWords || []).map(w => ({ ...w, type: 'WordEN', matchType: 'פירוש' }))];

        if (entity.root) {
          const relatedWords = (allEntities.Word || []).filter(w =>
            w.root === entity.root && w.id !== entity.id
          );
          matches = [...matches, ...(relatedWords || []).map(w => ({ ...w, type: 'Word', matchType: 'מילים הופכיות' }))];
        }
      }

      if (activeEntity === 'WordEN' && entity.word) {
        const hebrewWords = (allEntities.Word || []).filter(w =>
          w.word && entity.word && (
            w.word.toLowerCase().includes(entity.word.toLowerCase()) ||
            (w.vocalized && w.vocalized.toLowerCase().includes(entity.word.toLowerCase())) ||
            entity.word.toLowerCase().includes(w.word.toLowerCase()) ||
            (w.vocalized && entity.word.toLowerCase().includes(w.vocalized.toLowerCase()))
          )
        );

        matches = [...matches, ...(hebrewWords || []).map(w => ({ ...w, type: 'Word', matchType: 'פירוש' }))];
      }

      setPotentialMatches((matches || []).slice(0, 10));
    } catch (error) {
      console.error('Error finding potential matches:', error);
      setPotentialMatches([]);
    }
  };

  const handleOpenRelationshipModal = (entity) => {
    setSelectedEntity(entity);
    setShowRelationshipModal(true);
    setSearchEntities('');
    loadEntityRelationships(entity);
  };

  const handleEdit = (entity) => {
    // If editing an Image, use the image upload modal, otherwise use regular form
    if (activeEntity === 'Image') {
      // For image editing, we'll open the image upload modal with existing data
      setEditingEntity(entity);
      setShowImageUploadModal(true);
    } else {
      setEditingEntity(entity);
      setShowForm(true);
    }
    setErrors([]);
  };

  // Function to get allowed relationship types between two entity types
  const getAllowedRelationshipTypes = useCallback((sourceType, targetType) => {
    const allowedTypes = [];

    // Hebrew Word relationships
    if (sourceType === 'Word') {
      if (targetType === 'WordEN') {
        allowedTypes.push('פירוש', 'מילים הופכיות');
      } else if (targetType === 'Image') {
        allowedTypes.push('פירוש', 'מילים הופכיות');
      } else if (targetType === 'Attribute') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'QA') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'ContentList') {
        allowedTypes.push('פריט ברשימה');
      }
    }

    // English Word relationships
    else if (sourceType === 'WordEN') {
      if (targetType === 'Word') {
        allowedTypes.push('פירוש', 'מילים הופכיות');
      } else if (targetType === 'Image') {
        allowedTypes.push('פירוש', 'מילים הופכיות');
      } else if (targetType === 'Attribute') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'QA') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'ContentList') {
        allowedTypes.push('פריט ברשימה');
      }
    }

    // Image relationships
    else if (sourceType === 'Image') {
      if (targetType === 'Word') {
        allowedTypes.push('פירוש', 'מילים הופכיות');
      } else if (targetType === 'WordEN') {
        allowedTypes.push('פירוש', 'מילים הופכיות');
      } else if (targetType === 'Image') {
        allowedTypes.push('פירוש', 'מילים הופכיות');
      } else if (targetType === 'Attribute') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'QA') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'ContentList') {
        allowedTypes.push('פריט ברשימה');
      }
    }

    // QA relationships
    else if (sourceType === 'QA') {
      if (targetType === 'Word') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'WordEN') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'Image') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'Attribute') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'ContentList') {
        allowedTypes.push('פריט ברשימה');
      }
    }

    // Attribute relationships - can be linked to all content types except other attributes
    else if (sourceType === 'Attribute') {
      if (targetType === 'Word') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'WordEN') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'Image') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'QA') {
        allowedTypes.push('מאפיין');
      } else if (targetType === 'ContentList') {
        allowedTypes.push('מאפיין');
      }
      // Attribute to Attribute - not allowed
    }

    // ContentList relationships
    else if (sourceType === 'ContentList') {
      if (targetType !== 'ContentList') {
        allowedTypes.push('פריט ברשימה');
      }
      if (targetType === 'Attribute') {
        allowedTypes.push('מאפיין');
      }
    }

    // Use a Set to ensure uniqueness, then convert back to array
    return Array.from(new Set(allowedTypes));
  }, []);


  // Enhanced relationship creation with bidirectional logic but single record
  const handleCreateMultipleRelationships = async (targetEntities, relationshipTypes) => {
    if (!selectedEntity || targetEntities.length === 0 || relationshipTypes.length === 0) {
      showMessage('error', 'בחר פריטים וסוגי קשרים ליצירה.');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const targetEntity of targetEntities) {
        try {
          // Check if relationship already exists (in both directions)
          const existingRelationships = await Promise.all([
            ContentRelationship.filter({
              source_id: selectedEntity.id,
              source_type: activeEntity,
              target_id: targetEntity.id,
              target_type: targetEntity.type
            }).catch(() => []), // Add catch for robustness
            ContentRelationship.filter({
              source_id: targetEntity.id,
              source_type: targetEntity.type,
              target_id: selectedEntity.id,
              target_type: activeEntity
            }).catch(() => []) // Add catch for robustness
          ]);

          // Combine results and pick the first one if any exists
          const allExisting = [...existingRelationships[0], ...existingRelationships[1]];
          const existingRel = allExisting.length > 0 ? allExisting[0] : null;

          if (existingRel) {
            // Check if any of the new relationship types already exist
            const existingTypes = Array.isArray(existingRel.relationship_types)
              ? existingRel.relationship_types
              : [existingRel.relationship_types];

            const newTypes = relationshipTypes.filter(type => !existingTypes.includes(type));

            if (newTypes.length > 0) {
              // Add new relationship types to existing relationship
              const updatedTypes = Array.from(new Set([...existingTypes, ...newTypes]));
              await ContentRelationship.update(existingRel.id, {
                relationship_types: updatedTypes
              });
              successCount++;
            } else {
              console.log('Relationship already exists with these types, skipping');
              // Increment successCount even if no new types were added, as the operation was "successful" in that no error occurred and the relationship is there.
              successCount++;
            }
          } else {
            // Create new relationship (only one direction from selectedEntity to targetEntity)
            await ContentRelationship.create({
              source_id: selectedEntity.id,
              source_type: activeEntity,
              target_id: targetEntity.id,
              target_type: targetEntity.type,
              relationship_types: relationshipTypes,
              added_by: currentUser?.email || 'admin',
              is_approved: true,
              approved_by: currentUser?.email || 'admin',
              source: 'manual'
            });
            successCount++;
          }
        } catch (error) {
          console.error('Error creating/updating relationship:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showMessage('success', `${successCount} קשרים נוצרו/עודכנו בהצלחה`);
      }
      if (errorCount > 0) {
        showMessage('error', `${errorCount} קשרים נכשלו ביצירה/עדכון`);
      }

      loadEntityRelationships(selectedEntity);
    } catch (error) {
      console.error('Error creating multiple relationships:', error);
      showMessage('error', 'שגיאה ביצירת הקשרים');
    }
  };

  const handleDeleteRelationship = async (relationshipId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק קשר זה?')) return;

    try {
      await ContentRelationship.delete(relationshipId);
      showMessage('success', 'הקשר נמחק בהצלחה');
      loadEntityRelationships(selectedEntity);
    } catch (error) {
      console.error('Error deleting relationship:', error);
      showMessage('error', 'שגיאה במחיקת הקשר');
    }
  };

  const handleSave = async (entityData) => {
    try {
      const EntityClass = getEntityClass(activeEntity);

      const isEditing = !!editingEntity;

      if (!isEditing) {
        entityData.added_by = currentUser?.email || 'admin';
        entityData.is_approved = true;
        entityData.approved_by = currentUser?.email || 'admin';
        entityData.source = 'manual';
      }

      if (isEditing) {
        await EntityClass.update(editingEntity.id, entityData);
        showMessage('success', 'הנתונים עודכנו בהצלחה');
      } else {
        await EntityClass.create(entityData);
      }

      // After successful save, reset form states
      setShowForm(false);
      setEditingEntity(null);
      setErrors([]);

      loadEntities();
      loadAllEntities();
    } catch (error) {
      console.error('Error saving entity:', error);
      showMessage('error', 'שגיאה בשמירת הנתונים');
      throw error;
    }
  };

  const handleDelete = async (entity) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק פריט זה?')) return;

    try {
      const EntityClass = getEntityClass(activeEntity);

      // Check for game relationships before deleting entity
      const gameRelationships = await checkEntityGameRelationships(entity.id, activeEntity);
      if (gameRelationships.length > 0) {
        showMessage('error', 'לא ניתן למחוק פריט זה כי הוא מקושר למשחקים. נתק את הקשרים קודם.');
        return;
      }

      // If deleting an image, also delete the file from server
      if (activeEntity === 'Image' && entity.file_url && entity.file_url.startsWith('http')) {
        try {
          // Delete the file from server using centralized apiRequest
          await apiRequest('/delete-file', {
            method: 'DELETE',
            body: JSON.stringify({ fileUrl: entity.file_url })
          });
        } catch (fileDeleteError) {
          console.warn('Error deleting file from server:', fileDeleteError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete relationships first
      await deleteEntityRelationships(entity.id, activeEntity);

      // Delete associated tags
      await deleteEntityContentTags(entity.id, activeEntity);

      // Then delete the entity
      await EntityClass.delete(entity.id);
      showMessage('success', 'הפריט נמחק בהצלחה');
      loadEntities();
      loadAllEntities();
    } catch (error) {
      console.error('Error deleting entity:', error);
      showMessage('error', 'שגיאה במחיקת הפריט');
    }
  };

  // Handle image upload success
  const handleImageUploaded = (imageData) => {
    setShowImageUploadModal(false);
    setEditingEntity(null);
    // Reload images to show the new one
    loadEntities(); // This reloads entities based on activeEntity
    showMessage('success', editingEntity ? 'התמונה עודכנה בהצלחה' : 'התמונה הועלתה בהצלחה');
  };

  // Add bulk deletion helper functions
  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAllItems = () => {
    setSelectedItems(new Set(filteredEntities.map(entity => entity.id)));
  };

  const deselectAllItems = () => {
    setSelectedItems(new Set());
  };

  // Improve checkEntityGameRelationships with error handling
  const checkEntityGameRelationships = async (entityId, entityType) => {
    try {
      // Check if entity is connected to games
      const [asSource, asTarget] = await Promise.all([
        ContentRelationship.filter({
          source_id: entityId,
          source_type: entityType,
          target_type: 'Game'
        }).catch(() => []), // Return empty array on error
        ContentRelationship.filter({
          target_id: entityId,
          target_type: entityType,
          source_type: 'Game'
        }).catch(() => []) // Return empty array on error
      ]);

      return [...asSource, ...asTarget];
    } catch (error) {
      console.error('Error checking game relationships:', error);
      return [];
    }
  };

  // Improve deleteEntityRelationships with error handling
  const deleteEntityRelationships = async (entityId, entityType) => {
    try {
      // Get all relationships where entity is source or target
      const [asSource, asTarget] = await Promise.all([
        ContentRelationship.filter({
          source_id: entityId,
          source_type: entityType
        }).catch(() => []), // Return empty array on error
        ContentRelationship.filter({
          target_id: entityId,
          target_type: entityType
        }).catch(() => []) // Return empty array on error
      ]);

      const allRelationships = [...asSource, ...asTarget];

      // Delete all relationships
      for (const relationship of allRelationships) {
        try {
          await ContentRelationship.delete(relationship.id);
        } catch (error) {
          console.error('Error deleting individual relationship:', error);
        }
      }

      return allRelationships.length;
    } catch (error) {
      console.error('Error deleting entity relationships:', error);
      return 0;
    }
  };

  // Add function to delete entity content tags
  const deleteEntityContentTags = async (entityId, entityType) => {
    try {
      // Get all content tags for this entity
      const contentTags = await ContentTag.filter({
        content_id: entityId,
        content_type: entityType
      }).catch(() => []); // Add catch for robustness

      // Delete each content tag individually
      for (const contentTag of contentTags) {
        await ContentTag.delete(contentTag.id);
      }

      return contentTags.length;
    } catch (error) {
      console.error('Error deleting entity content tags:', error);
      return 0;
    }
  };

  const performBulkDelete = async () => {
    const itemsToDelete = Array.from(selectedItems);
    const EntityClass = getEntityClass(activeEntity);

    const results = {
      deleted: [],
      skipped: [],
      errors: []
    };

    for (const itemId of itemsToDelete) {
      try {
        const entity = entities.find(e => e.id === itemId);
        if (!entity) {
          results.errors.push({
            entityId: itemId,
            error: 'Entity not found in current list.'
          });
          continue;
        }

        // Check for game relationships
        const gameRelationships = await checkEntityGameRelationships(itemId, activeEntity);

        if (gameRelationships.length > 0) {
          results.skipped.push({
            entity: entity,
            reason: `מקושר ל-${gameRelationships.length} משחקים`
          });
          continue;
        }
        
        // If deleting an image, also delete the file from server
        if (activeEntity === 'Image' && entity.file_url && entity.file_url.startsWith('http')) {
          try {
            // Delete the file from server using centralized apiRequest
            await apiRequest('/delete-file', {
              method: 'DELETE',
              body: JSON.stringify({ fileUrl: entity.file_url })
            });
          } catch (fileDeleteError) {
            console.warn('Error deleting file from server during bulk delete:', fileDeleteError);
            // Continue with database deletion even if file deletion fails
          }
        }

        // Delete relationships first
        const deletedRelationships = await deleteEntityRelationships(itemId, activeEntity);

        // Delete associated tags
        await deleteEntityContentTags(itemId, activeEntity);

        // Then delete the entity
        await EntityClass.delete(itemId);

        results.deleted.push({
          entity: entity,
          relationshipsDeleted: deletedRelationships
        });

      } catch (error) {
        console.error('Error deleting entity:', itemId, error);
        results.errors.push({
          entityId: itemId,
          error: error.message
        });
      }
    }

    setBulkDeleteResults(results);
    setSelectedItems(new Set());
    await loadEntities(); // Refresh the list
  };


  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-2 sm:p-4" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 mb-4 sm:mb-6">
          {/* Title Section */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <Book className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">ניהול תכנים למשחקים</h1>
            <p className="text-gray-600 text-sm sm:text-base">יצירה ועריכה של מילים, תמונות, שאלות ורשימות תוכן</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Button
              onClick={() => setShowTagManagement(true)}
              variant="outline"
              className="flex-1 sm:flex-none bg-white hover:bg-gray-50 text-gray-700 border-gray-300 px-4 py-3 rounded-xl shadow-sm"
            >
              <Tags className="w-4 h-4 ml-2" />
              ניהול תגיות
            </Button>
            <Button
              onClick={() => {
                setShowContentTypeModal(true);
                setErrors([]);
                setEditingEntity(null); // Ensure no entity is being edited when opening content type modal
              }}
              className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              צור תוכן חדש
            </Button>
          </div>

          {/* Bulk Selection Alert */}
          {selectedItems.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-blue-900">
                    נבחרו {selectedItems.size} פריטים
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deselectAllItems}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    בטל בחירה
                  </Button>
                </div>
                <Button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק נבחרים
                </Button>
              </div>
            </div>
          )}

          {/* Entity Type Selector - Improved Mobile Layout */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">סוג תוכן</h3>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              {contentTypes.map(({ key, label, icon: Icon }) => {
                const count = activeEntity === key ? entities.length : '';
                const isActive = activeEntity === key;

                return (
                  <Button
                    key={key}
                    onClick={() => {
                      setActiveEntity(key);
                      setSelectedItems(new Set());
                    }}
                    variant={isActive ? 'default' : 'outline'}
                    className={`flex flex-col sm:flex-row items-center gap-2 p-3 h-auto text-center sm:text-right rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : 'hover:bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <span className="text-xs sm:text-sm font-medium">{label}</span>
                      {count !== '' && (
                        <span className="text-xs bg-black/20 px-2 py-0.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Search and Filters - Mobile Optimized */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="חפש תוכן..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-12 py-3 rounded-xl border-gray-200 text-base"
              />
            </div>

            <div className="flex gap-3">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="flex-1 rounded-xl py-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המקורות</SelectItem>
                  <SelectItem value="manual">ידני</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllItems}
                  disabled={filteredEntities.length === 0}
                  className="px-3 py-2 text-xs"
                >
                  בחר הכל
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAllItems}
                  disabled={selectedItems.size === 0}
                  className="px-3 py-2 text-xs"
                >
                  בטל הכל
                </Button>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex justify-between items-center text-sm text-gray-600 pt-2 border-t border-gray-200">
              <span>
                {selectedItems.size > 0 ? `נבחרו ${selectedItems.size} מתוך ` : ''}
                {filteredEntities.length} פריטים
              </span>
              <span className="text-xs">
                {getEntityTypeName(activeEntity)}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Messages */}
        {message && (
          <div className="mb-4">
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="border-none shadow-lg rounded-xl">
              {message.type === 'error' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription className="font-medium">{message.text}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Enhanced Entities List */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-6"></div>
              <p className="text-gray-600 text-lg font-medium">טוען נתונים...</p>
            </div>
          ) : filteredEntities.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                {React.createElement(getEntityIcon(activeEntity), { className: "w-10 h-10 text-purple-600" })}
              </div>
              {activeEntity === 'Rules' ? (
                <>
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">כללי משחק</h3>
                  <p className="text-gray-500 mb-6 text-center">
                    הפונקציונליות עדיין בפיתוח
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 inline-block">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ תכונה זו תהיה זמינה בקרוב
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">אין תוכן זמין</h3>
                  <p className="text-gray-500 mb-6 text-center">
                    {searchTerm ? 'לא נמצאו תוצאות החיפוש' : `עדיין לא נוצרו ${getEntityTypeName(activeEntity)}`}
                  </p>
                  <Button
                    onClick={() => {
                      if (activeEntity === 'Image') {
                        setShowImageUploadModal(true); // Directly open upload modal if active entity is Image
                      } else {
                        setShowContentTypeModal(true); // Else, open content type selection
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <Plus className="w-5 h-5 ml-2" />
                    צור תוכן חדש
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredEntities.map((entity, index) => (
                <div
                  key={entity.id}
                  className={`p-4 sm:p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 ${
                    selectedItems.has(entity.id) ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(entity.id)}
                        onChange={() => toggleItemSelection(entity.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                    </div>

                    {/* Entity Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        {activeEntity === 'Image' && entity.file_url && !entity.file_url.startsWith('http') ? (
                          <span className="text-xl sm:text-2xl text-white">{entity.file_url}</span>
                        ) : (
                          React.createElement(getEntityIcon(activeEntity), { className: "w-5 h-5 sm:w-6 sm:h-6 text-white" })
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title and Actions Row */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight flex-1 min-w-0">
                          <span className="break-words">
                            {getEntityDisplayName(entity, activeEntity)}
                          </span>
                        </h3>

                        {/* Action Buttons - Mobile Optimized */}
                        <div className="flex gap-1 ml-3 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenContentTagModal(entity)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-100 rounded-lg p-2"
                            title="נהל תגיות"
                          >
                            <Tags className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRelationshipModal(entity)}
                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg p-2"
                            title="נהל קשרים"
                          >
                            <Link className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(entity)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg p-2"
                            title="עריכה"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(entity)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg p-2"
                            title="מחיקה"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Entity Details */}
                      <div className="text-sm text-gray-600 space-y-1 mb-3">
                        {activeEntity === 'Word' && (
                          <div className="space-y-1">
                            {entity.word && <div><span className="font-medium">בלי ניקוד:</span> {entity.word}</div>}
                            {entity.root && <div><span className="font-medium">שורש:</span> {entity.root}</div>}
                            {entity.context && (
                              <div className="break-words">
                                <span className="font-medium">הקשר:</span> {entity.context}
                              </div>
                            )}
                          </div>
                        )}
                        {activeEntity === 'WordEN' && (
                          <div><span className="font-medium">מילה:</span> {entity.word}</div>
                        )}
                        {activeEntity === 'Image' && (
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              {entity.file_url && entity.file_url.startsWith('http') ? (
                                <img src={entity.file_url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                              ) : (
                                <span className="text-2xl">{entity.file_url}</span>
                              )}
                            </div>
                            <div className="break-words text-gray-700">{entity.description}</div>
                          </div>
                        )}
                        {activeEntity === 'QA' && (
                          <div className="space-y-1">
                            <div className="text-green-700">✓ {entity.correct_answers?.length || 0} תשובות נכונות</div>
                            <div className="text-red-700">✗ {entity.incorrect_answers?.length || 0} תשובות שגויות</div>
                          </div>
                        )}
                        {activeEntity === 'ContentList' && (
                          <div className="break-words">{entity.description}</div>
                        )}
                      </div>

                      {/* Entity Tags Display */}
                      {entityTags[entity.id] && entityTags[entity.id].length > 0 && (
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Tags className="w-3 h-3 text-gray-500" />
                          {isLargeScreen ? (
                            entityTags[entity.id].length <= 3 ? (
                              entityTags[entity.id].map(tag => (
                                <span key={tag.id} className="inline-flex items-center bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                                  #{tag.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-indigo-600 font-medium">
                                {entityTags[entity.id].length} תגיות
                              </span>
                            )
                          ) : (
                            // Mobile: always show text format if there are tags
                            <span className="text-xs text-indigo-600 font-medium">
                              {entityTags[entity.id].length} תגית{entityTags[entity.id].length > 1 ? 'ות' : ''}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Relationship Counts - Mobile Optimized */}
                      {entityRelationshipCounts[entity.id] && Object.keys(entityRelationshipCounts[entity.id]).length > 0 && (
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className="text-xs text-gray-500 font-medium">מקושר ל:</span>
                          {Object.entries(entityRelationshipCounts[entity.id]).map(([type, count]) => {
                            const TypeIconComponent = getEntityIcon(type);
                            const typeLabel = getEntityTypeLabel(type);
                            return (
                              <span key={type} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                                {type === 'Image' ? (
                                    <span className="text-xs">{typeLabel}</span>
                                ) : (
                                    <TypeIconComponent className="w-3 h-3 text-gray-600" />
                                )}
                                {(type === 'Word' || type === 'WordEN') && (
                                  <span className="text-xs font-medium text-gray-600">{typeLabel}</span>
                                )}
                                <span className="text-xs font-bold text-purple-600">{count}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Meta Information - Mobile Optimized */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(entity.created_date).toLocaleDateString('he-IL')}
                        </div>
                        {entity.source && (
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            entity.source === 'ai' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {entity.source === 'ai' ? 'AI' : 'ידני'}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          entity.is_approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entity.is_approved ? 'מאושר' : 'ממתין לאישור'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Type Selection Modal */}
        {showContentTypeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
              <div className="p-4 md:p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-base md:text-lg font-semibold">
                    בחר סוג תוכן להוספה
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowContentTypeModal(false);
                      setErrors([]);
                    }}
                    className="text-white hover:bg-white/20 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 md:p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {contentTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.key}
                        onClick={() => handleContentTypeSelect(type.key)}
                        className="p-3 md:p-4 border border-purple-100 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 cursor-pointer transition-all duration-200 hover:border-purple-300 hover:shadow-lg transform hover:scale-105"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1 text-sm md:text-base">
                              {type.label}
                            </h4>
                            <p className="text-xs md:text-sm text-gray-500 line-clamp-2">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        <ConfirmationDialog
          isOpen={showBulkDeleteConfirm}
          onClose={() => setShowBulkDeleteConfirm(false)}
          onConfirm={() => {
            setShowBulkDeleteConfirm(false);
            performBulkDelete();
          }}
          title="אישור מחיקה מרובה"
          message={`האם אתה בטוח שברצונך למחוק ${selectedItems.size} פריטים?\n\nפריטים המקושרים למשחקים לא יימחקו.\nכל הקשרים של הפריטים שיימחקו יוסרו גם כן.`}
          confirmText="מחק"
          cancelText="ביטול"
          variant="danger"
        />

        {/* Bulk Delete Results Modal */}
        {bulkDeleteResults && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir="rtl">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">תוצאות מחיקה מרובה</h3>

              {/* Successfully Deleted */}
              {bulkDeleteResults.deleted.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    נמחקו בהצלחה ({bulkDeleteResults.deleted.length})
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {bulkDeleteResults.deleted.map((item, index) => (
                      <div key={index} className="text-sm text-green-800">
                        • {getEntityDisplayName(item.entity, activeEntity)}
                        {item.relationshipsDeleted > 0 && (
                          <span className="text-green-600"> (+ {item.relationshipsDeleted} קשרים)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped Items */}
              {bulkDeleteResults.skipped.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    לא נמחקו ({bulkDeleteResults.skipped.length})
                  </h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {bulkDeleteResults.skipped.map((item, index) => (
                      <div key={index} className="text-sm text-yellow-800">
                        • {getEntityDisplayName(item.entity, activeEntity)} - {item.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {bulkDeleteResults.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    שגיאות ({bulkDeleteResults.errors.length})
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                    {bulkDeleteResults.errors.map((item, index) => (
                      <div key={index} className="text-sm text-red-800">
                        • פריט {item.entityId}: {item.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setBulkDeleteResults(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  סגור
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Relationship Modal */}
        {showRelationshipModal && selectedEntity && (
          <RelationshipModal
            selectedEntity={selectedEntity}
            activeEntity={activeEntity}
            entityRelationships={entityRelationships}
            allEntities={allEntities}
            searchEntities={searchEntities}
            setSearchEntities={setSearchEntities}
            potentialMatches={potentialMatches}
            filteredSearchEntities={filteredSearchEntities}
            loadingRelationships={loadingRelationships}
            onClose={() => setShowRelationshipModal(false)}
            onDeleteRelationship={handleDeleteRelationship}
            onCreateMultipleRelationships={handleCreateMultipleRelationships}
            getEntityDisplayName={getEntityDisplayName}
            getEntityIcon={getEntityIcon}
            getAllowedRelationshipTypes={getAllowedRelationshipTypes}
            currentUser={currentUser}
          />
        )}

        {/* Entity Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-lg w-full max-h-[90vh] overflow-hidden flex flex-col ${
              (activeEntity === 'Word' && isLargeScreen && !editingEntity) ? 'max-w-6xl' :
              (activeEntity === 'WordEN' && !editingEntity) ? 'max-w-2xl' :
              'max-w-md'
            }`}>
              <div className="p-4 md:p-6 border-b flex-shrink-0">
                <div className="flex justify-between items-center">
                  <h3 className="text-base md:text-lg font-semibold">
                    {editingEntity ? 'עריכת' : 'הוספת'} {
                      activeEntity === 'Word' ? (isLargeScreen && !editingEntity ? 'מילים בעברית' : 'מילה בעברית') :
                      activeEntity === 'WordEN' ? (!editingEntity ? 'מילים באנגלית' : 'מילה באנגלית') :
                      activeEntity === 'Image' ? 'תמונה' : // This case will not be reached due to handleEdit/handleContentTypeSelect logic
                      activeEntity === 'QA' ? 'שאלה ותשובה' :
                      activeEntity === 'Attribute' ? 'תכונה' :
                      activeEntity === 'ContentList' ? 'רשימת תוכן' : activeEntity
                    }
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowForm(false);
                      setEditingEntity(null);
                      setErrors([]);
                    }}
                    className="flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-4 md:p-6 overflow-y-auto flex-1">
                <EntityForm
                  entityType={activeEntity}
                  entity={editingEntity}
                  onSave={handleSave}
                  onCancel={() => {
                    setShowForm(false);
                    setEditingEntity(null);
                    setErrors([]);
                  }}
                  showMessage={showMessage}
                  errors={errors}
                  setErrors={setErrors}
                  isLargeScreen={isLargeScreen}
                  currentUser={currentUser} // Pass currentUser to EntityForm
                />
              </div>
            </div>
          </div>
        )}

        {/* Image Upload Modal */}
        <ImageUploadModal
          isOpen={showImageUploadModal}
          onClose={() => {
            setShowImageUploadModal(false);
            setEditingEntity(null);
          }}
          onImageUploaded={handleImageUploaded}
          editingImage={editingEntity}
        />

        {/* Content Tag Management Modal */}
        {showContentTagModal && selectedContentForTags && (
          <ContentTagManagementModal
            isOpen={showContentTagModal}
            onClose={() => {
              setShowContentTagModal(false);
              setSelectedContentForTags(null);
            }}
            content={selectedContentForTags}
            contentType={activeEntity}
            onTagsUpdated={() => {
              // Reload entity tags for the specific entity that was updated
              loadEntityTags([selectedContentForTags]);
            }}
            getEntityDisplayName={getEntityDisplayName}
            getEntityIcon={getEntityIcon}
          />
        )}

        {/* Tag Management Modal */}
        {showTagManagement && (
          <TagManagementModal
            isOpen={showTagManagement}
            onClose={() => setShowTagManagement(false)}
          />
        )}
      </div>
    </div>
  );
}

// ConfirmationDialog component
function ConfirmationDialog({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant = "default" }) {
  if (!isOpen) return null;

  const confirmButtonClass = variant === "danger"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            {cancelText || "ביטול"}
          </Button>
          <Button className={confirmButtonClass} onClick={onConfirm}>
            {confirmText || "אישור"}
          </Button>
        </div>
      </div>
    </div>
  );
}


// Entity Form Component
function EntityForm({ entityType, entity, onSave, onCancel, showMessage, errors, setErrors, isLargeScreen, currentUser }) {
  const [formData, setFormData] = useState(() => {
    switch (entityType) {
      case 'Word':
        return {
          vocalized: entity?.vocalized || '',
          word: entity?.word || '',
          root: entity?.root || '',
          context: entity?.context || '',
          difficulty: entity?.difficulty || 0
        };
      case 'WordEN':
        return {
          word: entity?.word || '',
          difficulty: entity?.difficulty || 0
        };
      // 'Image' case removed as it's handled by ImageUploadModal
      case 'Attribute':
        return {
          type: entity?.type || '',
          value: entity?.value || ''
        };
      case 'ContentList':
        return {
          name: entity?.name || '',
          description: entity?.description || ''
        };
      default:
        return {};
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving entity:', error);
      showMessage('error', 'שגיאה בשמירת הנתונים');
      throw error;
    }
  };

  const renderFields = () => {
    // formData is now always a single object.
    const currentData = formData;

    switch (entityType) {
      case 'Word':
        return (
          <>
            <div>
              <Label htmlFor="vocalized">מילה מנוקדת *</Label>
              <Input
                id="vocalized"
                value={currentData.vocalized}
                onChange={(e) => setFormData({...currentData, vocalized: e.target.value})}
                required
                className="text-right"
              />
            </div>
            <div>
              <Label htmlFor="word">מילה ללא ניקוד *</Label>
              <Input
                id="word"
                value={currentData.word}
                onChange={(e) => setFormData({...currentData, word: e.target.value})}
                required
                className="text-right"
              />
            </div>
            <div>
              <Label htmlFor="root">שורש</Label>
              <Input
                id="root"
                value={currentData.root}
                onChange={(e) => setFormData({...currentData, root: e.target.value})}
                placeholder="ד.ג.מ"
                className="text-right"
              />
            </div>
            <div>
              <Label htmlFor="context">הקשר *</Label>
              <Input
                id="context"
                value={currentData.context}
                onChange={(e) => setFormData({...currentData, context: e.target.value})}
                placeholder="המילה הזו היא דוגמה טובה"
                required
                className="text-right"
              />
            </div>
            <div>
              <Label htmlFor="difficulty">רמת קושי (0-10)</Label>
              <Input
                id="difficulty"
                type="number"
                min="0"
                max="10"
                value={currentData.difficulty}
                onChange={(e) => setFormData({...currentData, difficulty: parseInt(e.target.value) || 0})}
              />
            </div>
          </>
        );
      case 'WordEN':
        return (
          <>
            <div>
              <Label htmlFor="word">מילה באנגלית *</Label>
              <Input
                id="word"
                value={currentData.word}
                onChange={(e) => setFormData({...currentData, word: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="difficulty">רמת קושי (0-10)</Label>
              <Input
                id="difficulty"
                type="number"
                min="0"
                max="10"
                value={currentData.difficulty}
                onChange={(e) => setFormData({...currentData, difficulty: parseInt(e.target.value) || 0})}
              />
            </div>
          </>
        );
      // Removed renderImageFields() call here as 'Image' type is handled separately
      case 'Attribute':
        return (
          <>
            <div>
              <Label htmlFor="type">סוג תכונה *</Label>
              <Input
                id="type"
                value={currentData.type}
                onChange={(e) => setFormData({...currentData, type: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="value">ערך *</Label>
              <Input
                id="value"
                value={currentData.value}
                onChange={(e) => setFormData({...currentData, value: e.target.value})}
                required
              />
            </div>
          </>
        );
      case 'ContentList':
        return (
          <>
            <div>
              <Label htmlFor="name">שם הרשימה *</Label>
              <Input
                id="name"
                value={currentData.name}
                onChange={(e) => setFormData({...currentData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">תיאור *</Label>
              <Textarea
                id="description"
                value={currentData.description}
                onChange={(e) => setFormData({...currentData, description: e.target.value})}
                required
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {entityType === 'QA' ? (
        // Render QAForm directly for QA type, as it handles its own form and submission
        <QAForm
          entity={entity}
          isEditing={!!entity}
          onSave={onSave} // This onSave is GameContentManagement's handleSave
          onCancel={onCancel}
          currentUser={currentUser}
          errors={errors}
        />
      ) : (
        // Render the general form for other entity types (not including 'Image')
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderFields()}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button type="submit">
              {entity ? 'עדכן' : 'צור'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}

// QA Form Component
function QAForm({ entity, isEditing, onSave, onCancel, currentUser, errors = [] }) {
  const [question, setQuestion] = useState(entity?.question_text || '');
  const [correctAnswers, setCorrectAnswers] = useState(entity?.correct_answers || [{ answer_text: '', points: 1 }]);
  const [incorrectAnswers, setIncorrectAnswers] = useState(entity?.incorrect_answers || ['']);
  const [difficulty, setDifficulty] = useState(entity?.difficulty || 0);

  const addCorrectAnswer = () => {
    setCorrectAnswers([...correctAnswers, { answer_text: '', points: 1 }]);
  };

  const removeCorrectAnswer = (index) => {
    if (correctAnswers.length > 1) {
      setCorrectAnswers(correctAnswers.filter((_, i) => i !== index));
    }
  };

  const updateCorrectAnswer = (index, field, value) => {
    const updated = [...correctAnswers];
    updated[index][field] = field === 'points' ? Number(value) : value;
    setCorrectAnswers(updated);
  };

  const addIncorrectAnswer = () => {
    setIncorrectAnswers([...incorrectAnswers, '']);
  };

  const removeIncorrectAnswer = (index) => {
    setIncorrectAnswers(incorrectAnswers.filter((_, i) => i !== index));
  };

  const updateIncorrectAnswer = (index, value) => {
    const updated = [...incorrectAnswers];
    updated[index] = value;
    setIncorrectAnswers(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Filter out empty answers
    const filteredCorrectAnswers = correctAnswers.filter(answer => answer.answer_text.trim());
    const filteredIncorrectAnswers = incorrectAnswers.filter(answer => answer.trim());

    if (!question.trim()) {
      alert('נא להזין שאלה');
      return;
    }

    if (filteredCorrectAnswers.length === 0) {
      alert('נא להזין לפחות תשובה נכונה אחת');
      return;
    }

    const qaData = {
      question_text: question.trim(),
      correct_answers: filteredCorrectAnswers,
      incorrect_answers: filteredIncorrectAnswers,
      difficulty: difficulty,
      source: 'manual',
      added_by: currentUser?.email
    };

    onSave(qaData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question */}
      <div>
        <Label htmlFor="question" className="text-base font-semibold">שאלה *</Label>
        <Input
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="הזן את השאלה..."
          className="mt-2"
          required
        />
      </div>

      {/* Correct Answers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold text-green-700">תשובות נכונות *</Label>
          <Button type="button" onClick={addCorrectAnswer} size="sm" className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 ml-2" />
            הוסף תשובה נכונה
          </Button>
        </div>
        <div className="space-y-3">
          {correctAnswers.map((answer, index) => (
            <div key={index} className="flex gap-3 items-center p-3 border border-green-200 rounded-lg bg-green-50">
              <Input
                value={answer.answer_text}
                onChange={(e) => updateCorrectAnswer(index, 'answer_text', e.target.value)}
                placeholder="תשובה נכונה..."
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Label className="text-sm">נקודות:</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={answer.points}
                  onChange={(e) => updateCorrectAnswer(index, 'points', e.target.value)}
                  className="w-20"
                />
              </div>
              {correctAnswers.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCorrectAnswer(index)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Incorrect Answers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold text-red-700">תשובות שגויות</Label>
          <Button type="button" onClick={addIncorrectAnswer} size="sm" className="bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4 ml-2" />
            הוסף תשובה שגויה
          </Button>
        </div>
        <div className="space-y-3">
          {incorrectAnswers.map((answer, index) => (
            <div key={index} className="flex gap-3 items-center p-3 border border-red-200 rounded-lg bg-red-50">
              <Input
                value={answer}
                onChange={(e) => updateIncorrectAnswer(index, e.target.value)}
                placeholder="תשובה שגויה..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeIncorrectAnswer(index)}
                className="text-red-600 hover:text-red-800 hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <Label htmlFor="difficulty" className="text-base font-semibold">רמת קושי</Label>
        <Input
          id="difficulty"
          type="number"
          min="0"
          max="10"
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          className="mt-2 w-32"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {isEditing ? 'עדכן שאלה' : 'צור שאלה'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </form>
  );
}

// Relationship Modal Component
function RelationshipModal({
  selectedEntity,
  activeEntity,
  entityRelationships,
  allEntities,
  searchEntities,
  setSearchEntities,
  potentialMatches,
  filteredSearchEntities,
  loadingRelationships,
  onClose,
  onDeleteRelationship,
  onCreateMultipleRelationships,
  getEntityDisplayName,
  getEntityIcon,
  getAllowedRelationshipTypes,
  currentUser
}) {
  const [selectedEntities, setSelectedEntities] = useState([]);
  const [selectedRelationshipTypes, setSelectedRelationshipTypes] = useState([]);

  // Filter out custom game word relationships - double protection
  const filteredEntityRelationships = entityRelationships.filter(relationship => {
    // Skip all Game relationships completely
    if (relationship.source_type === 'Game' || relationship.target_type === 'Game') {
      return false;
    }
    return true;
  });

  // Check if an entity is already selected
  const isEntitySelected = (entity) =>
    selectedEntities.some(e => e.id === entity.id && e.type === entity.type);

  const handleEntityToggle = (entity) => {
    setSelectedEntities(prev => {
      const isSelected = isEntitySelected(entity);
      if (isSelected) {
        return prev.filter(e => !(e.id === entity.id && e.type === entity.type));
      } else {
        return [...prev, entity];
      }
    });
  };

  const handleRelationshipTypeToggle = (type) => {
    setSelectedRelationshipTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleCreateRelationships = () => {
    if (selectedEntities.length > 0 && selectedRelationshipTypes.length > 0) {
      onCreateMultipleRelationships(selectedEntities, selectedRelationshipTypes);
      setSelectedEntities([]);
      setSelectedRelationshipTypes([]);
      setSearchEntities('');
    }
  };

  // Get all unique allowed relationship types from selected entities
  const availableRelationshipTypes = useMemo(() => {
    if (selectedEntities.length === 0) return [];

    // Get a list of allowed types for each selected entity
    const allowedTypesForEachSelected = selectedEntities.map(entity =>
      getAllowedRelationshipTypes(activeEntity, entity.type)
    );

    if (allowedTypesForEachSelected.length === 0) {
      return [];
    }

    // Find the intersection of all allowed type sets
    let intersection = new Set(allowedTypesForEachSelected[0]);
    for (let i = 1; i < allowedTypesForEachSelected.length; i++) {
      const currentSet = new Set(allowedTypesForEachSelected[i]);
      intersection = new Set(
        [...intersection].filter(x => currentSet.has(x))
      );
    }

    return Array.from(intersection);
  }, [selectedEntities, activeEntity, getAllowedRelationshipTypes]);

  // Auto-select relationship type if only one is available
  useEffect(() => {
    if (availableRelationshipTypes.length === 1) {
      setSelectedRelationshipTypes(availableRelationshipTypes);
    } else {
      setSelectedRelationshipTypes(prev =>
        prev.filter(type => availableRelationshipTypes.includes(type))
      );
    }
  }, [availableRelationshipTypes]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b flex-shrink-0">
          <div className="flex justify-between items-center">
            <h3 className="text-base md:text-lg font-semibold">
              ניהול קשרים עבור: {getEntityDisplayName(selectedEntity, activeEntity)}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1">
          {/* Existing Relationships */}
          <div className="mb-6">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              קשרים קיימים ({filteredEntityRelationships.length})
            </h4>
            {loadingRelationships ? (
              <div className="text-center py-4">טוען קשרים...</div>
            ) : filteredEntityRelationships.length === 0 ? (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                עדיין אין קשרים לפריט זה
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEntityRelationships.map((relationship) => {
                  // Determine the "other" entity in the relationship for display
                  const isSource = relationship.source_id === selectedEntity.id && relationship.source_type === activeEntity;
                  const relatedEntityType = isSource ? relationship.target_type : relationship.source_type;
                  const relatedEntityId = isSource ? relationship.target_id : relationship.source_id;

                  // Find the full related entity object using allEntities map
                  let relatedEntity = null;
                  if (allEntities[relatedEntityType] && Array.isArray(allEntities[relatedEntityType])) {
                    relatedEntity = allEntities[relatedEntityType].find(e => e.id === relatedEntityId);
                  }

                  // Fallback if entity not found
                  const displayEntityName = relatedEntity ? getEntityDisplayName(relatedEntity, relatedEntityType) : `פריט ID: ${relatedEntityId}`;
                  const displayEntityType = relatedEntity ? relatedEntityType : 'לא ידוע';

                  return (
                    <div key={relationship.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border rounded-lg gap-2 bg-white">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {displayEntityName}
                          <Badge variant="outline" className="text-xs mr-2">{displayEntityType}</Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          קשר: {Array.isArray(relationship.relationship_types) ? relationship.relationship_types.join(', ') : relationship.relationship_types}
                        </div>
                        <div className="text-xs text-gray-400">
                          נוסף ב: {new Date(relationship.created_date).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteRelationship(relationship.id)}
                        className="text-red-600 hover:text-red-700 self-end sm:self-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create New Relationships */}
          <div className="space-y-6">
            <h4 className="font-medium flex items-center gap-2">
              <Plus className="w-4 h-4" />
              יצירת קשרים חדשים
            </h4>

            {/* Search entities */}
            <div>
              <Label>חפש פריטים לקישור</Label>
              <Input
                placeholder="חפש תוכן לקישור..."
                value={searchEntities}
                onChange={(e) => setSearchEntities(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Selection Summary */}
            {selectedEntities.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">
                  נבחרו {selectedEntities.length} פריטים לקישור:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {selectedEntities.map((entity, index) => {
                    const Icon = getEntityIcon(entity.type);
                    return (
                      <div key={`${entity.type}-${entity.id}`} className="flex items-center gap-1 bg-white rounded-full px-3 py-1 text-sm border">
                        {entity.type === 'Image' && entity.file_url && !entity.file_url.startsWith('http') ? (
                          <span className="text-lg">{entity.file_url}</span>
                        ) : (
                          <Icon className="w-3 h-3" />
                        )}
                        <span>{getEntityDisplayName(entity, entity.type)}</span>
                        <button
                          type="button"
                          onClick={() => handleEntityToggle(entity)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Relationship Types Selection */}
            {selectedEntities.length > 0 && (
              <div>
                <Label>בחר סוגי קשרים (חובה)</Label>
                {availableRelationshipTypes.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableRelationshipTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer bg-gray-100 px-3 py-1 rounded-full text-sm">
                        <input
                          type="checkbox"
                          checked={selectedRelationshipTypes.includes(type)}
                          onChange={() => handleRelationshipTypeToggle(type)}
                          disabled={availableRelationshipTypes.length === 1}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-red-600 mt-2">אין סוגי קשרים זמינים בין הפריטים הנבחרים.</p>
                )}
              </div>
            )}

            {/* Create Button */}
            {selectedEntities.length > 0 && selectedRelationshipTypes.length > 0 && (
              <div className="flex justify-end">
                <Button
                  onClick={handleCreateRelationships}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  צור קשרים ({selectedEntities.length * selectedRelationshipTypes.length})
                </Button>
              </div>
            )}

            {/* Search Results */}
            {searchEntities && filteredSearchEntities.length > 0 && (
              <div>
                <Label>תוצאות חיפוש</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto mt-1">
                  {filteredSearchEntities.map((entity) => {
                    const Icon = getEntityIcon(entity.type);
                    const isChecked = isEntitySelected(entity);
                    const allowedTypes = getAllowedRelationshipTypes(activeEntity, entity.type);

                    return (
                      <div
                        key={`${entity.type}-${entity.id}`}
                        className={`p-3 border-b last:border-b-0 cursor-pointer flex items-center gap-3 ${
                          isChecked ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleEntityToggle(entity)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleEntityToggle(entity)}
                          className="rounded text-blue-600"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {entity.type === 'Image' && entity.file_url && !entity.file_url.startsWith('http') ? (
                            <span className="text-lg">{entity.file_url}</span>
                          ) : (
                            <Icon className="w-4 h-4 text-gray-600" />
                          )}
                          <span className="font-medium text-sm flex-1">{getEntityDisplayName(entity, entity.type)}</span>
                          <Badge variant="outline" className="text-xs">{entity.type}</Badge>
                        </div>
                        {allowedTypes.length === 0 && (
                          <span className="text-xs text-red-500">אין קשרים מ permitted</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Potential Matches */}
            {potentialMatches.length > 0 && (
              <div>
                <Label>הצעות מומלצות</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto mt-1">
                  {potentialMatches.map((match) => {
                    const Icon = getEntityIcon(match.type);
                    const isChecked = isEntitySelected(match);

                    return (
                      <div
                        key={`${match.type}-${match.id}`}
                        className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 border-green-200 ${
                          isChecked ? 'bg-green-100' : 'hover:bg-green-50'
                        }`}
                        onClick={() => handleEntityToggle(match)}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleEntityToggle(match)}
                          className="rounded text-blue-600"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {match.type === 'Image' && match.file_url && !match.file_url.startsWith('http') ? (
                            <span className="text-lg">{match.file_url}</span>
                          ) : (
                            <Icon className="w-4 h-4 text-gray-600" />
                          )}
                          <span className="font-medium text-sm flex-1">{getEntityDisplayName(match, match.type)}</span>
                          <Badge className="bg-green-100 text-green-800 text-xs">{match.matchType}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tag Management Modal Component
function TagManagementModal({ isOpen, onClose }) {
  const [tags, setTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [usageFilter, setUsageFilter] = useState('all'); // 'all', 'used', 'unused'
  const [isLoading, setIsLoading] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [tagUsage, setTagUsage] = useState({});

  // Load tags and their usage counts
  const loadTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const allTags = await GameContentTag.list('-created_date').catch(() => []);
      setTags(allTags);

      // Calculate usage counts
      await calculateTagUsage(allTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
    setIsLoading(false);
  }, []);

  // Calculate how many content items use each tag
  const calculateTagUsage = async (tagList) => {
    const usage = {};

    try {
      for (const tag of tagList) {
        usage[tag.id] = 0;
        try {
          const contentTagRelations = await ContentTag.filter({
            tag_id: tag.id
          }).catch(() => []);
          usage[tag.id] = contentTagRelations.length;
        } catch (error) {
          console.error('Error calculating usage for tag:', tag.id, error);
        }
      }

      setTagUsage(usage);
    } catch (error) {
      console.error('Error calculating tag usage:', error);
    }
  };

  // Create new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    try {
      await GameContentTag.create({ name: newTagName.trim() });
      setNewTagName('');
      await loadTags();
    } catch (error) {
      console.error('Error creating tag:', error);
      alert('שגיאה ביצירת התגית');
    }
    setIsCreating(false);
  };

  // Delete tag
  const handleDeleteTag = async (tag) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את התגית "${tag.name}"?`)) return;

    try {
      // First, remove all ContentTag relationships that use this tag
      const contentTagRelations = await ContentTag.filter({ tag_id: tag.id }).catch(() => []);
      for (const relation of contentTagRelations) {
        await ContentTag.delete(relation.id);
      }

      // Then, delete the tag itself
      await GameContentTag.delete(tag.id);
      await loadTags();
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('שגיאה במחיקת התגית');
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen, loadTags]);

  // Filter tags based on search and usage
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const isUsed = (tagUsage[tag.id] || 0) > 0;

    if (usageFilter === 'used') return isUsed;
    if (usageFilter === 'unused') return !isUsed;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 md:p-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Tags className="w-6 h-6" />
              <h2 className="text-lg md:text-xl font-bold">ניהול תגיות תוכן</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 md:p-6 border-b bg-gray-50 flex-shrink-0">
          {/* Create new tag */}
          <div className="mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="הזן שם תגית חדשה..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                className="flex-1"
              />
              <Button
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || isCreating}
                className="bg-green-600 hover:bg-green-700 text-white px-4 md:px-6"
              >
                <Plus className="w-4 h-4 md:ml-2" />
                <span className="hidden md:inline">הוסף</span>
              </Button>
            </div>
          </div>

          {/* Search and filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="חפש תגיות..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={usageFilter} onValueChange={setUsageFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל התגיות</SelectItem>
                <SelectItem value="used">תגיות בשימוש</SelectItem>
                <SelectItem value="unused">תגיות לא בשימוש</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tags List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">טוען תגיות...</p>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <Tags className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {searchTerm || usageFilter !== 'all' ? 'לא נמצאו תגיות' : 'אין תגיות במערכת'}
              </h3>
              <p className="text-gray-500">
                {searchTerm || usageFilter !== 'all' ? 'נסה לשנות את החיפוש או הסינון' : 'צור את התגית הראשונה שלך'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTags.map(tag => {
                const usageCount = tagUsage[tag.id] || 0;
                const isUsed = usageCount > 0;

                return (
                  <div key={tag.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isUsed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">#{tag.name}</h3>
                        <p className="text-sm text-gray-500">
                          {isUsed ? `בשימוש ב-${usageCount} תכנים` : 'לא בשימוש'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isUsed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {usageCount}
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTag(tag)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t bg-gray-50 text-center flex-shrink-0">
          <p className="text-sm text-gray-500">
            סה"כ {tags.length} תגיות במערכת • {Object.values(tagUsage).filter(count => count > 0).length} בשימוש
          </p>
        </div>
      </div>
    </div>
  );
}
