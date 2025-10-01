# Price Display Component Usage

## Overview
Unified price display system using `PriceDisplayTag` component and helper functions.

## Helper Functions (from `lib/utils.js`)

### `calculateFinalPrice(originalPrice, discount)`
Calculate the final price after applying discount percentage.

```javascript
import { calculateFinalPrice } from '@/lib/utils';

// Example: 100₪ with 20% discount = 80₪
const finalPrice = calculateFinalPrice(100, 20); // Returns: 80

// Use when sending to API
const purchaseData = {
  product_id: productId,
  amount: calculateFinalPrice(product.price, product.discount)
};
```

### `formatPriceWithDiscount(originalPrice, discount)`
Get formatted price information object.

```javascript
import { formatPriceWithDiscount } from '@/lib/utils';

const priceInfo = formatPriceWithDiscount(100, 20);
// Returns: {
//   display: "80 ₪",
//   isFree: false,
//   isDiscounted: true,
//   discountPercent: 20,
//   originalPrice: 100,
//   ...
// }
```

## PriceDisplayTag Component

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `originalPrice` | `number` | Required | The original price |
| `discount` | `number\|null` | `null` | Discount percentage (0-100) |
| `showDiscount` | `boolean` | `true` | Whether to show discount info |
| `className` | `string` | `''` | Additional CSS classes |
| `size` | `string` | `'md'` | Size: 'sm', 'md', 'lg', 'xl' |
| `variant` | `string` | `'badge'` | Style: 'badge', 'text', 'gradient' |

### Usage Examples

#### Basic Usage - Badge Variant
```jsx
import PriceDisplayTag from '@/components/ui/PriceDisplayTag';

// Free product
<PriceDisplayTag originalPrice={0} />
// Output: Green badge with "חינם!"

// Regular price
<PriceDisplayTag originalPrice={100} />
// Output: Blue badge with "₪100"

// With discount
<PriceDisplayTag originalPrice={100} discount={20} />
// Output: Blue badge "₪80" + crossed "₪100" + red badge "חסכון 20%"

// Without showing discount details
<PriceDisplayTag originalPrice={100} discount={20} showDiscount={false} />
// Output: Only blue badge "₪80"
```

#### Text Variant
```jsx
<PriceDisplayTag
  originalPrice={150}
  discount={30}
  variant="text"
  size="lg"
/>
// Output: Large blue text "₪105" + crossed "₪150" + red text "חסכון 30%"
```

#### Gradient Variant
```jsx
<PriceDisplayTag
  originalPrice={200}
  discount={25}
  variant="gradient"
  size="xl"
/>
// Output: Extra large gradient text "₪150" + crossed "₪200" + savings text
```

## Migration Guide

### Before (Old Code)
```jsx
// Old inline price display
{item.price === 0 ? (
  <span className="text-green-600">חינם!</span>
) : (
  <span>₪{item.price}</span>
)}
```

### After (New Component)
```jsx
import PriceDisplayTag from '@/components/ui/PriceDisplayTag';

<PriceDisplayTag originalPrice={item.price} discount={item.discount} />
```

## Size Examples

### Small (sm)
```jsx
<PriceDisplayTag originalPrice={50} size="sm" />
// Compact size for cards or lists
```

### Medium (md) - Default
```jsx
<PriceDisplayTag originalPrice={100} />
// Standard size for most uses
```

### Large (lg)
```jsx
<PriceDisplayTag originalPrice={150} size="lg" />
// Larger size for product details
```

### Extra Large (xl)
```jsx
<PriceDisplayTag originalPrice={200} size="xl" />
// Hero sections and main CTAs
```

## Real-World Examples

### Product Card
```jsx
<Card>
  <CardHeader>
    <h3>{product.title}</h3>
  </CardHeader>
  <CardContent>
    <PriceDisplayTag
      originalPrice={product.price}
      discount={product.discount}
      variant="badge"
      size="md"
    />
  </CardContent>
</Card>
```

### Product Details Header
```jsx
<div className="absolute bottom-6 right-6">
  <PriceDisplayTag
    originalPrice={item.price}
    discount={item.discount}
    variant="badge"
    size="lg"
  />
</div>
```

### Purchase Summary
```jsx
<div className="price-summary">
  <PriceDisplayTag
    originalPrice={item.price}
    discount={coupon?.discount}
    variant="gradient"
    size="xl"
  />
</div>
```

## API Usage

When sending price to API, use `calculateFinalPrice`:

```javascript
import { calculateFinalPrice } from '@/lib/utils';

const handlePurchase = async () => {
  const finalPrice = calculateFinalPrice(product.price, product.discount);

  await fetch('/api/purchases', {
    method: 'POST',
    body: JSON.stringify({
      product_id: product.id,
      amount: finalPrice
    })
  });
};
```
