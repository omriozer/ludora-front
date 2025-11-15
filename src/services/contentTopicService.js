// Content Topic Service with association management
import { apiRequest } from './apiClient.js';
import { ContentTopic } from './entities.js';

export class ContentTopicService {

  // Basic CRUD operations (delegated to EntityAPI)
  async list(query = {}) {
    return ContentTopic.find(query);
  }

  async findById(id) {
    return ContentTopic.findById(id);
  }

  async create(data) {
    return ContentTopic.create(data);
  }

  async update(id, data) {
    return ContentTopic.update(id, data);
  }

  async delete(id) {
    return ContentTopic.delete(id);
  }

  // Product-Topic Association Methods

  /**
   * Get topics associated with a product via content_topic_id field
   */
  async getProductTopics(productId) {
    const product = await apiRequest(`/entities/product/${productId}?include=contentTopic`);

    if (!product) {
      return { topics: [] };
    }

    // Return the content topic in an array format for backward compatibility
    const topics = product.contentTopic ? [product.contentTopic] : [];

    return { topics };
  }

  /**
   * Update topic for a product via content_topic_id field
   * Note: Since products now have only one content topic, we take the first topicId
   */
  async updateProductTopics(productId, topicIds) {
    const content_topic_id = topicIds && topicIds.length > 0 ? topicIds[0] : null;
    console.log(`🔄 Updating product ${productId} content topic to:`, content_topic_id);

    try {
      console.log('📤 Making API request:', {
        url: `/entities/product/${productId}`,
        method: 'PUT',
        body: { content_topic_id }
      });

      const response = await apiRequest(`/entities/product/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ content_topic_id })
      });

      console.log('📥 API response received:', response);
      return response;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  /**
   * Get products tagged with a specific topic via content_topic_id field
   */
  async getTopicProducts(topicId, options = {}) {
    const params = new URLSearchParams();
    params.set('content_topic_id', topicId);

    if (options.limit) params.set('limit', options.limit);
    if (options.offset) params.set('offset', options.offset);
    if (options.publishedOnly !== undefined) params.set('is_published', options.publishedOnly);

    const query = params.toString();
    const endpoint = `/entities/product?${query}`;

    const result = await apiRequest(endpoint);

    // Transform the result to match the expected format
    return {
      products: result || [],
      total: result?.length || 0
    };
  }

  // Curriculum Item-Topic Association Methods (via Products)

  /**
   * Get topics associated with a curriculum item through its products
   */
  async getCurriculumItemTopics(curriculumItemId) {
    // Get curriculum item with its products and their content topics
    const curriculumItem = await apiRequest(`/entities/curriculum-item/${curriculumItemId}?include=contentTopics`);

    if (!curriculumItem || !curriculumItem.products) {
      return { topics: [] };
    }

    // Extract unique content topics from all products
    const topicsMap = new Map();
    curriculumItem.products.forEach(product => {
      if (product.contentTopic) {
        topicsMap.set(product.contentTopic.id, product.contentTopic);
      }
    });

    return { topics: Array.from(topicsMap.values()) };
  }

  /**
   * Update topics for a curriculum item through its products
   * NOTE: This is deprecated as topics should be managed at the product level
   */
  async updateCurriculumItemTopics(curriculumItemId, topicIds) {
    console.warn('updateCurriculumItemTopics is deprecated. Content topics should be managed at the product level.');
    throw new Error('Content topics should be managed at the product level, not curriculum item level.');
  }

  /**
   * Get curriculum items that have products with a specific topic
   */
  async getTopicCurriculumItems(topicId, options = {}) {
    // Get products with this topic first
    const productsResult = await this.getTopicProducts(topicId, options);

    if (!productsResult.products || productsResult.products.length === 0) {
      return { curriculum_items: [], total: 0 };
    }

    // Get curriculum items that use these products
    const curriculumItemsMap = new Map();
    const productIds = productsResult.products.map(p => p.id);

    // Use the curriculum product junction table to find curriculum items
    for (const productId of productIds) {
      try {
        const result = await apiRequest(`/entities/product/${productId}/curriculum-items`);
        if (result.curriculum_items) {
          result.curriculum_items.forEach(item => {
            if (!curriculumItemsMap.has(item.id)) {
              curriculumItemsMap.set(item.id, {
                ...item,
                associatedProducts: [productId]
              });
            } else {
              curriculumItemsMap.get(item.id).associatedProducts.push(productId);
            }
          });
        }
      } catch (error) {
        // Continue if some products don't have curriculum items
      }
    }

    const curriculumItems = Array.from(curriculumItemsMap.values());

    // Apply curriculum filter if specified
    let filteredItems = curriculumItems;
    if (options.curriculumId) {
      filteredItems = curriculumItems.filter(item => item.curriculum_id === options.curriculumId);
    }

    // Apply pagination
    const total = filteredItems.length;
    const offset = options.offset || 0;
    const limit = options.limit || total;
    const paginatedItems = filteredItems.slice(offset, offset + limit);

    return {
      curriculum_items: paginatedItems,
      total: total
    };
  }


  // Utility Methods

  /**
   * Get active content topics for dropdown/selection UI
   */
  async getActiveTopics() {
    return this.list({ is_active: true });
  }

  /**
   * Search topics by name
   */
  async searchTopics(query, options = {}) {
    return this.list({
      search: query,
      is_active: options.activeOnly !== false,
      limit: options.limit || 20
    });
  }

  /**
   * Get topic usage statistics
   */
  async getTopicUsage(topicId) {
    const [products, curriculumItems] = await Promise.all([
      this.getTopicProducts(topicId),
      this.getTopicCurriculumItems(topicId)
    ]);

    return {
      topicId,
      products: {
        total: products.total || 0,
        published: products.products?.filter(p => p.is_published).length || 0
      },
      curriculumItems: {
        total: curriculumItems.total || 0,
        mandatory: curriculumItems.curriculum_items?.filter(ci => ci.is_mandatory).length || 0
      }
    };
  }

  /**
   * Bulk update topics for multiple products
   */
  async bulkUpdateProductTopics(updates) {
    const promises = updates.map(({ productId, topicIds }) =>
      this.updateProductTopics(productId, topicIds)
    );

    return Promise.all(promises);
  }

  /**
   * Bulk update topics for multiple curriculum items
   * NOTE: This is deprecated as topics should be managed at the product level
   */
  async bulkUpdateCurriculumItemTopics(updates) {
    console.warn('bulkUpdateCurriculumItemTopics is deprecated. Content topics should be managed at the product level.');
    throw new Error('Content topics should be managed at the product level, not curriculum item level.');
  }
}

// Export singleton instance
export const contentTopicService = new ContentTopicService();
export default contentTopicService;