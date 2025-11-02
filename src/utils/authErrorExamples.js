/**
 * Auth Error Handler Usage Examples
 *
 * This file demonstrates how to use the new authentication error handling system
 * throughout the Ludora application.
 */

import { useGlobalAuthErrorHandler } from '@/components/providers/AuthErrorProvider';
import { Product, User } from '@/services/apiClient';

// Example 1: Basic usage in a component
export function ExampleComponent() {
  const { handleAuthError, withAuthErrorHandling } = useGlobalAuthErrorHandler();

  // Method 1: Manual error handling
  const handleSaveProduct = async (productData) => {
    try {
      const result = await Product.update(productId, productData);
      // Handle success
      console.log('Product saved successfully');
    } catch (error) {
      // Try to handle as auth error first
      const wasHandled = handleAuthError(error, () => {
        // This callback will run if user logs in successfully
        handleSaveProduct(productData); // Retry the operation
      });

      if (!wasHandled) {
        // Not an auth error, handle normally
        console.error('Save failed:', error.message);
        toast({
          title: "שגיאה בשמירה",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  // Method 2: Automatic error handling with wrapper
  const handleLoadProducts = async () => {
    await withAuthErrorHandling(
      () => Product.find({ limit: 10 }),
      {
        autoRetry: true, // Automatically retry after successful login
        onSuccess: (products) => {
          setProducts(products);
          console.log('Products loaded successfully');
        },
        onError: (error) => {
          // Handle non-auth errors
          console.error('Failed to load products:', error.message);
          toast({
            title: "שגיאה בטעינת מוצרים",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div>
      <button onClick={handleSaveProduct}>Save Product</button>
      <button onClick={handleLoadProducts}>Load Products</button>
    </div>
  );
}

// Example 2: Usage in a custom hook
export function useProductsWithAuth() {
  const { withAuthErrorHandling } = useGlobalAuthErrorHandler();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    await withAuthErrorHandling(
      () => Product.find(),
      {
        onSuccess: (data) => {
          setProducts(data.results || data);
          setLoading(false);
        },
        onError: (error) => {
          setLoading(false);
          toast({
            title: "שגיאה בטעינת מוצרים",
            description: "לא ניתן לטעון את המוצרים כעת",
            variant: "destructive"
          });
        }
      }
    );
  }, [withAuthErrorHandling]);

  return { products, loading, loadProducts };
}

// Example 3: Usage in an API service wrapper
export class AuthAwareProductService {
  constructor(authErrorHandler) {
    this.authErrorHandler = authErrorHandler;
  }

  async getAllProducts() {
    return this.authErrorHandler.withAuthErrorHandling(
      () => Product.find(),
      {
        autoRetry: true,
        onError: (error) => {
          console.error('Failed to load products:', error);
          throw error; // Re-throw for caller to handle
        }
      }
    );
  }

  async saveProduct(productData) {
    return this.authErrorHandler.withAuthErrorHandling(
      () => Product.create(productData),
      {
        autoRetry: true,
        onError: (error) => {
          console.error('Failed to save product:', error);
          throw error;
        }
      }
    );
  }
}

// Example 4: What happens automatically when auth errors occur

/*
AUTOMATIC BEHAVIOR:

1. User tries to upload an image while their token is expired
2. API returns 403 Forbidden
3. ApiError is thrown with status code 403
4. useAuthErrorHandler detects it's an auth error
5. Hebrew toast message appears: "יש בעיה באימות המשתמש. אנא התחבר שנית לאפליקציה."
6. Login modal opens automatically
7. User logs in with Google
8. Success message appears: "התחברת בהצלחה. תוכל עכשיו להמשיך בפעולה שלך"
9. Original upload operation retries automatically (if autoRetry: true)
10. Image upload completes successfully

USER EXPERIENCE:
- No cryptic error messages
- Clear Hebrew instructions
- Seamless re-authentication
- Automatic retry of failed operation
- Minimal interruption to workflow

DEVELOPER EXPERIENCE:
- No need to handle auth errors manually in every component
- Consistent error handling across the entire app
- Hebrew error messages handled automatically
- Optional retry functionality
- Easy integration with existing code
*/

export default {
  ExampleComponent,
  useProductsWithAuth,
  AuthAwareProductService
};