import { useState, useEffect, useCallback } from 'react';
import { Settings } from '@/services/entities';
import { getProductTypeName } from '@/config/productTypes';
import { clog, cerror } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

/**
 * Unified Product Catalog Hook
 * Handles data loading, filtering, and state management for all product types
 * (games, files, workshops, courses, tools)
 */
export default function useProductCatalog(productType, filters, activeTab) {
  // Get user from UserContext instead of loading independently
  const { currentUser, isLoading: isLoadingUser } = useUser();

  // State management
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userPurchases, setUserPurchases] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState(null);


  // Get the Product service (unified for all product types)
  const getProductService = useCallback(async () => {
    const { Product } = await import('@/services/entities');
    return Product;
  }, []);

  // Helper function to get entity service for a product type
  const getEntityService = useCallback(async (productType) => {
    const serviceMap = {
      'game': 'Game',
      'file': 'File',
      'workshop': 'Workshop',
      'course': 'Course',
      'tool': 'Tool'
    };

    const serviceName = serviceMap[productType];
    if (!serviceName) {
      throw new Error(`Unknown product type: ${productType}`);
    }

    const entities = await import('@/services/entities');
    return entities[serviceName];
  }, []);

  // Main data loading function
  const loadData = useCallback(async () => {
    setIsLoadingProducts(true);
    setError(null);

    let productsData = [];
    let usersData = [];
    let appSettings = null;
    let purchasesData = [];

    try {
      // 1. Use currentUser from UserContext - no need to load separately
      console.log('✅ useProductCatalog - Using user from UserContext:', {
        id: currentUser?.id,
        email: currentUser?.email,
        role: currentUser?.role,
        full_name: currentUser?.full_name,
        isAuthenticated: !!currentUser
      });


      // 2. Load all users for display names (needed for creator attribution)
      try {
        const { User } = await import('@/services/entities');
        usersData = await User.find();
      } catch (error) {
        cerror("Error loading users for display names:", error);
        usersData = [];
      }

      // 3. Load settings
      try {
        const settingsArray = await Settings.find();
        appSettings = settingsArray.length > 0 ? settingsArray[0] : null;
        setSettings(appSettings);
      } catch (error) {
        cerror("Error loading application settings:", error);
        setSettings(null);
      }

      // 4. Load user purchases if logged in
      if (currentUser) {
        try {
          const { Purchase } = await import('@/services/entities');
          // Load purchases with 'paid', 'completed', and 'cart' statuses
          const [paidPurchases, completedPurchases, cartPurchases] = await Promise.all([
            Purchase.filter({
              buyer_user_id: currentUser.id,
              payment_status: 'paid'
            }),
            Purchase.filter({
              buyer_user_id: currentUser.id,
              payment_status: 'completed'
            }),
            Purchase.filter({
              buyer_user_id: currentUser.id,
              payment_status: 'cart'
            })
          ]);
          // Combine and deduplicate purchases
          const allPurchases = [...paidPurchases, ...completedPurchases, ...cartPurchases];
          const uniquePurchases = allPurchases.filter((purchase, index, self) =>
            index === self.findIndex(p => p.id === purchase.id)
          );
          purchasesData = uniquePurchases;

          // Debug logging for purchase data
          console.log('🔍 Loaded user purchases:', purchasesData);
          console.log('🔍 Purchase count:', purchasesData.length);
          if (purchasesData.length > 0) {
            console.log('🔍 Sample purchase:', purchasesData[0]);
            console.log('🔍 Purchase structure check:', {
              hasProductId: !!purchasesData[0].product_id,
              hasPurchasableId: !!purchasesData[0].purchasable_id,
              paymentStatus: purchasesData[0].payment_status
            });
          }

          setUserPurchases(purchasesData);
        } catch (error) {
          cerror("Error loading user purchases:", error);
          setUserPurchases([]);
        }
      }

      // 5. Load products based on user status and product type
      const ProductService = await getProductService();
      // Use polymorphic structure for product IDs like other components
      const purchasedProductIds = purchasesData.map(p => p.purchasable_id || p.product_id);

      if (currentUser) {
        // User is logged in, check for purchases and admin status
        try {
          // Load all products of this type
          const allProducts = await ProductService.filter({ product_type: productType });

          // Filter products: show if published, OR if purchased by the current user, OR if user is admin
          productsData = allProducts.filter(product =>
            product.is_published ||
            purchasedProductIds.includes(product.id) ||
            (currentUser.role === 'admin' || currentUser.role === 'sysadmin')
          );
        } catch (productError) {
          cerror(`Error loading ${productType} products for logged-in user:`, productError);
          // Fallback: show only published products for non-admins, all for admins
          if (currentUser.role === 'admin' || currentUser.role === 'sysadmin') {
            productsData = await ProductService.filter({ product_type: productType });
          } else {
            productsData = await ProductService.filter({
              product_type: productType,
              is_published: true
            });
          }
        }
      } else {
        // Not logged in - only show published products
        productsData = await ProductService.filter({
          product_type: productType,
          is_published: true
        });
      }

      // 6. Enhance products with entity data and creator display names
      const productsWithEntityData = await Promise.all(
        productsData.map(async (product) => {
          let enhancedProduct = { ...product };

          try {
            // Get entity data for this product if entity_id exists
            if (product.entity_id) {
              const EntityService = await getEntityService(productType);
              const entityData = await EntityService.findById(product.entity_id);

              if (entityData) {
                // Merge entity data with product data
                enhancedProduct = {
                  ...enhancedProduct,
                  ...entityData,
                  // Preserve Product model fields
                  id: product.id,
                  product_type: product.product_type,
                  entity_id: product.entity_id,
                  title: product.title,
                  description: product.description,
                  short_description: product.short_description,
                  price: product.price,
                  is_published: product.is_published,
                  is_featured: product.is_featured,
                  featured: product.featured,
                  created_by: product.created_by,
                  created_date: product.created_date,
                  updated_date: product.updated_date
                };
              }
            }
          } catch (entityError) {
            cerror(`Error loading entity data for product ${product.id}:`, entityError);
            // Continue without entity data
          }

          // Add creator display name
          const creator = usersData.find(u => u.email === enhancedProduct.created_by);
          enhancedProduct.created_by_display_name = creator?.display_name || creator?.full_name;

          return enhancedProduct;
        })
      );

      setProducts(productsWithEntityData);

      // 7. Extract categories for filtering
      const uniqueCategories = [...new Set(
        productsWithEntityData
          .map(product => product.category)
          .filter(Boolean)
      )].map(name => ({ name, id: name }));
      setCategories(uniqueCategories);

      clog(`✅ Loaded ${productsWithEntityData.length} ${getProductTypeName(productType, 'plural')}`);

    } catch (globalError) {
      cerror(`Critical error loading ${productType} catalog:`, globalError);
      setError(`שגיאה בטעינת ${getProductTypeName(productType, 'plural')}`);
      setProducts([]);
      setCategories([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [productType, getProductService, getEntityService, currentUser]);

  // Filter products based on current filters and active tab
  useEffect(() => {
    let filtered = [...products];

    // Apply tab filtering first
    if (activeTab === 'my' && currentUser) {
      // Use polymorphic structure for purchased IDs like other components
      const purchasedIds = userPurchases.map(p => p.purchasable_id || p.product_id);
      filtered = filtered.filter(product => purchasedIds.includes(product.id));
    } else if (activeTab === 'free') {
      filtered = filtered.filter(product => product.price === 0);
    } else if (activeTab === 'featured') {
      filtered = filtered.filter(product => product.featured || product.is_featured);
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.title?.toLowerCase().includes(searchTerm) ||
        product.short_description?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.subject?.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filtered = filtered.filter(product => product.category === filters.category);
    }

    // Apply grade filter
    if (filters.grade && filters.grade !== 'all') {
      filtered = filtered.filter(product => {
        if (!product.grade_range) return false;
        try {
          const gradeRange = typeof product.grade_range === 'string'
            ? JSON.parse(product.grade_range)
            : product.grade_range;
          const targetGrade = parseInt(filters.grade);
          return targetGrade >= (gradeRange.min || 1) && targetGrade <= (gradeRange.max || 12);
        } catch {
          return false;
        }
      });
    }

    // Apply subject filter
    if (filters.subject && filters.subject !== 'all') {
      filtered = filtered.filter(product => product.subject === filters.subject);
    }

    // Apply audience filter
    if (filters.audience && filters.audience !== 'all') {
      filtered = filtered.filter(product => product.target_audience === filters.audience);
    }

    // Apply game type filter (games only)
    if (filters.gameType && filters.gameType !== 'all' && productType === 'game') {
      filtered = filtered.filter(product => product.game_type === filters.gameType);
    }

    // Apply price filter
    if (filters.price && filters.price !== 'all') {
      if (filters.price === 'free') {
        filtered = filtered.filter(product => product.price === 0);
      } else if (filters.price === 'paid') {
        filtered = filtered.filter(product => product.price > 0);
      }
    }

    // Apply publish status filter (admin only)
    if (filters.publishStatus && filters.publishStatus !== 'all' && currentUser?.role === 'admin') {
      if (filters.publishStatus === 'published') {
        filtered = filtered.filter(product => product.is_published);
      } else if (filters.publishStatus === 'unpublished') {
        filtered = filtered.filter(product => !product.is_published);
      }
    }

    // Apply skill level filter
    if (filters.skillLevel && filters.skillLevel !== 'all') {
      filtered = filtered.filter(product => product.skill_level === filters.skillLevel);
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue = a[filters.sortBy];
        let bValue = b[filters.sortBy];

        // Handle special cases
        if (filters.sortBy === 'downloads_count') {
          aValue = a.downloads_count || a.file?.downloads_count || 0;
          bValue = b.downloads_count || b.file?.downloads_count || 0;
        }

        // Handle string sorting
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue, 'he');
          return filters.sortOrder === 'DESC' ? -comparison : comparison;
        }

        // Handle numeric sorting
        if (filters.sortOrder === 'DESC') {
          return bValue - aValue;
        } else {
          return aValue - bValue;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [products, filters, activeTab, currentUser, userPurchases, productType]);

  // Load data on mount and when dependencies change (but only after UserContext is loaded)
  useEffect(() => {
    if (!isLoadingUser) {
      loadData();
    }
  }, [loadData, isLoadingUser]);

  return {
    products,
    filteredProducts,
    categories,
    currentUser,
    userPurchases,
    settings,
    isLoading: isLoadingUser || isLoadingProducts,
    error,
    loadData
  };
}