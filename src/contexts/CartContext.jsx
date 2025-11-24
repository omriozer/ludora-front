import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCartPurchases } from '@/utils/purchaseHelpers';
import { useUser } from '@/contexts/UserContext';
import { clog, cerror } from '@/lib/utils';

// Custom event for cart changes
const CART_CHANGE_EVENT = 'ludora-cart-changed';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser, isAuthenticated } = useUser();

  // Load cart items from server
  const loadCartItems = useCallback(async () => {
    if (!isAuthenticated || !currentUser) {
      setCartItems([]);
      setCartCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const userId = currentUser.id;
      if (!userId) {
        setCartItems([]);
        setCartCount(0);
        return;
      }

      const cartPurchases = await getCartPurchases(userId);
      setCartItems(cartPurchases);
      setCartCount(cartPurchases.length);
      clog(`Cart loaded: ${cartPurchases.length} items`);
    } catch (error) {
      cerror('Error loading cart items:', error);
      setCartItems([]);
      setCartCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, currentUser]);

  // Refresh cart data and notify other components
  const refreshCart = useCallback(() => {
    loadCartItems();
    // Emit custom event to notify other components (like product catalog)
    window.dispatchEvent(new CustomEvent(CART_CHANGE_EVENT));
    clog('Cart refreshed - notified other components');
  }, [loadCartItems]);

  // Add item to cart (increment count without refetching)
  const addToCart = useCallback(() => {
    setCartCount(prev => prev + 1);
  }, []);

  // Remove item from cart (decrement count without refetching)
  const removeFromCart = useCallback((removedItemId) => {
    setCartItems(prev => prev.filter(item => item.id !== removedItemId));
    setCartCount(prev => Math.max(0, prev - 1));
  }, []);

  // Clear cart
  const clearCart = useCallback(() => {
    setCartItems([]);
    setCartCount(0);
  }, []);

  // Load cart items when authentication state changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadCartItems();
    }
  }, [isAuthenticated, currentUser, loadCartItems]);

  const value = {
    cartItems,
    cartCount,
    isLoading,
    refreshCart,
    addToCart,
    removeFromCart,
    clearCart,
    loadCartItems
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}