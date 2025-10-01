# Price Display Migration Summary

## Completed ✅
- ✅ ProductDetails.jsx - All price displays replaced
- ✅ Files.jsx - File cards using PriceDisplayTag
- ✅ Workshops.jsx - Workshop cards using PriceDisplayTag

## Remaining Files to Update

### High Priority (User-Facing Pages)
1. **Products.jsx** (line 691): `{product.original_price} ₪`
2. **Tools.jsx** (line 476): `₪{tool.price}`
3. **GamesCatalog.jsx** (line 518): `{game.price > 0 ? `₪${game.price}` : 'חינם'}`
4. **Courses.jsx** (line 381): `₪{course.price}`
5. **Games.jsx** (line 157): `<Badge>₪{game.price}</Badge>`

### Medium Priority (Purchase/Payment Flow)
6. **ProductPurchase.jsx** (lines 592, 816): Price displays in purchase flow
7. **PaymentModal.jsx** (lines 240, 247, 251, 314, 368): Payment modal prices
8. **Registration.jsx** (lines 436, 439, 440, 511, 516, 559, 564): Registration prices

### Low Priority (Admin/Internal)
9. **MyAccount.jsx** (lines 743, 823, 925, 1058): User account prices
10. **Purchases.jsx** (lines 284, 339, 343): Purchase history
11. **PaymentResult.jsx** (line 492): Payment confirmation
12. **Participants.jsx** (line 187): Participant management
13. **SubscriptionSettings.jsx** (lines 326, 477, 604, 609, 615, 902): Subscription UI
14. **SubscriptionModal.jsx** (lines 764, 767): Subscription modal
15. **SubscriptionManagementModal.jsx** (line 239): Subscription management

### Component Files
16. **ProductPricing.jsx** (line 56): Already uses formatPrice, needs PriceDisplayTag
17. **ProductImage.jsx** (line 64): Product image component
18. **FileHeroSection.jsx** (line 100): File hero section
19. **ProductCard.jsx**: Generic product card component
20. **GamePreviewStep.jsx** (line 14): Game builder preview

## Quick Migration Pattern

### Before:
```jsx
{item.price === 0 ? (
  <span>חינם!</span>
) : (
  <span>₪{item.price}</span>
)}
```

### After:
```jsx
<PriceDisplayTag
  originalPrice={item.price}
  discount={item.discount}
  variant="badge"  // or "text" or "gradient"
  size="md"        // or "sm" or "lg" or "xl"
  showDiscount={true}  // or false to hide discount details
/>
```

## Import Statement
Add to each file:
```jsx
import PriceDisplayTag from '@/components/ui/PriceDisplayTag';
```

## Notes
- Most files don't have discount field yet, pass `discount={item.discount}` or `discount={null}`
- Free items (price = 0) automatically show "חינם!"
- Component handles all formatting, no need for manual ₪ or formatting
- Use `calculateFinalPrice(price, discount)` when sending to API
