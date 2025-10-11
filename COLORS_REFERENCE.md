# 🎨 Color Palette Reference

## Light Theme

```
┌─────────────────────────────────────────────┐
│  Background: #F5F7FA                        │
│  ┌───────────────────────────────────────┐  │
│  │  Card/Surface: #FFFFFF                │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  Primary Button: #4C6EF5        │  │  │
│  │  │  Text: #1A1B1E                  │  │  │
│  │  │  Accent: #7B93DB                │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │  Border: #DDE1E7                      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Color Values
| Element | Hex | RGB | HSL |
|---------|-----|-----|-----|
| **Background** | `#F5F7FA` | `rgb(245, 247, 250)` | `hsl(214, 32%, 97%)` |
| **Surface** | `#FFFFFF` | `rgb(255, 255, 255)` | `hsl(0, 0%, 100%)` |
| **Primary** | `#4C6EF5` | `rgb(76, 110, 245)` | `hsl(226, 89%, 63%)` |
| **Accent** | `#7B93DB` | `rgb(123, 147, 219)` | `hsl(221, 55%, 67%)` |
| **Text** | `#1A1B1E` | `rgb(26, 27, 30)` | `hsl(225, 9%, 11%)` |
| **Border** | `#DDE1E7` | `rgb(221, 225, 231)` | `hsl(215, 23%, 89%)` |

---

## Dark Theme

```
┌─────────────────────────────────────────────┐
│  Background: #1B1E26                        │
│  ┌───────────────────────────────────────┐  │
│  │  Card/Surface: #252832                │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  Primary Button: #729BFF        │  │  │
│  │  │  Text: #E9ECF3                  │  │  │
│  │  │  Accent: #A6B5E0                │  │  │
│  │  └─────────────────────────────────┘  │  │
│  │  Border: #343843                      │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Color Values
| Element | Hex | RGB | HSL |
|---------|-----|-----|-----|
| **Background** | `#1B1E26` | `rgb(27, 30, 38)` | `hsl(224, 18%, 13%)` |
| **Surface** | `#252832` | `rgb(37, 40, 50)` | `hsl(225, 14%, 17%)` |
| **Primary** | `#729BFF` | `rgb(114, 155, 255)` | `hsl(220, 100%, 72%)` |
| **Accent** | `#A6B5E0` | `rgb(166, 181, 224)` | `hsl(221, 53%, 76%)` |
| **Text** | `#E9ECF3` | `rgb(233, 236, 243)` | `hsl(225, 33%, 93%)` |
| **Border** | `#343843` | `rgb(52, 56, 67)` | `hsl(225, 13%, 24%)` |

---

## Usage Examples

### In CSS
```css
/* Light mode */
background-color: #F5F7FA;
color: #1A1B1E;

/* Dark mode */
.dark {
  background-color: #1B1E26;
  color: #E9ECF3;
}
```

### In Tailwind
```tsx
<div className="bg-background text-foreground">
  <div className="bg-card border border-border">
    <button className="bg-primary text-primary-foreground">
      Primary Action
    </button>
    <button className="bg-accent text-accent-foreground">
      Secondary Action
    </button>
  </div>
</div>
```

### In Components
```tsx
// Background
<div className="bg-background">...</div>

// Cards
<div className="bg-card border border-border">...</div>

// Buttons
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Click me
</button>

// Accent elements
<div className="bg-accent text-accent-foreground">...</div>

// Text
<p className="text-foreground">Main text</p>
<p className="text-muted-foreground">Subtle text</p>
```

---

## Color Psychology

### Light Theme (#F5F7FA)
- **Professional & Clean:** Soft blue-gray background
- **Trustworthy:** Indigo primary evokes reliability
- **Modern:** Subtle accents, not overwhelming

### Dark Theme (#1B1E26)
- **Sophisticated:** Deep navy instead of pure black
- **Easy on Eyes:** Reduced strain for long sessions
- **Vibrant Focus:** Bright blue (#729BFF) draws attention

---

## Accessibility

Both themes meet WCAG AA standards:

✅ **Text Contrast:** 4.5:1 minimum
✅ **Button Contrast:** 3:1 minimum
✅ **Border Visibility:** Clear and distinct

---

## Quick Copy

### Light Theme
```
Background: #F5F7FA
Surface: #FFFFFF
Primary: #4C6EF5
Accent: #7B93DB
Text: #1A1B1E
Border: #DDE1E7
```

### Dark Theme
```
Background: #1B1E26
Surface: #252832
Primary: #729BFF
Accent: #A6B5E0
Text: #E9ECF3
Border: #343843
```

---

**Pro Tip:** Use the theme toggle in the top-right corner to switch between light and dark modes!
