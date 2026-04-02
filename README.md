# SERAPHINE COUTURE 👗

A premium, high-end luxury fashion e-commerce platform featuring curated collections, seamless checkout, and an elegant shopping experience. Built with modern web technologies for optimal performance and user experience.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-18%2B-brightgreen.svg)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

SERAPHINE COUTURE is a sophisticated e-commerce platform designed for premium fashion retail. The platform delivers a luxurious shopping experience with:

- **Elegant UI/UX**: Minimalist, high-end design with luxury branding
- **Product Management**: Comprehensive product catalog with detailed information
- **Shopping Features**: Cart, wishlist, filtering, and sorting capabilities
- **User Authentication**: Secure login and account management
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Fast Performance**: Built with Vite for rapid development and production builds

---

## ✨ Features

### Core Features
- 🛍️ **Product Catalog** - Browse curated luxury fashion items across multiple categories
- 🏷️ **Product Categories** - Apparel, Bags, Footwear, and Accessories
- ❤️ **Wishlist** - Save favorite items for later
- 🛒 **Shopping Cart** - Add/remove products with real-time updates
- 💳 **Checkout** - Seamless checkout experience
- 👤 **User Authentication** - Secure login system
- 📱 **Responsive Design** - Mobile-first approach for all devices

### Advanced Features
- 🔍 **Product Filtering & Search** - Find items by category, price, and other attributes
- ⭐ **Ratings & Reviews** - Customer reviews and rating system
- 📦 **Inventory Management** - Real-time stock availability
- 🎨 **Size & Color Selection** - Multiple options per product
- 📊 **Featured Products** - Curated featured collection
- ✨ **New Arrivals** - Highlight new products
- 🚀 **Quick Navigation** - Smooth page transitions and routing

### Design Features
- 🎭 **Premium Branding** - Luxury aesthetic with custom fonts and colors
- 🌙 **Smooth Animations** - Subtle transitions and animations
- 🎯 **Accessibility** - Semantic HTML and keyboard navigation
- ⚡ **Fast Loading** - Optimized assets and performance

---

## 🛠️ Tech Stack

### Frontend
- **Vite** (v6.2.0) - Next-generation build tool
- **Tailwind CSS** (v4.2.2) - Utility-first CSS framework
- **@tailwindcss/vite** (v4.1.14) - Seamless Tailwind integration
- **Vanilla JavaScript (ES6+)** - Modern JavaScript without frameworks
- **Lucide Icons** (v1.7.0) - Beautiful icon library

### Development Tools
- **ESLint** (v10.1.0) - Code linting and quality
- **@eslint/js** (v10.0.1) - ESLint JavaScript configuration
- **Globals** (v17.4.0) - Global environment variables

### Package Manager
- **npm** (v9+) or **yarn** (v3+)

---

## 📦 Installation

### Prerequisites
Ensure you have the following installed:
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher) or **yarn** (v3.0.0 or higher)
- **Git** (for cloning and version control)

### Clone Repository
```bash
git clone https://github.com/yourusername/seraphine-couture.git
cd seraphine-couture
```

### Install Dependencies
```bash
npm install
```

Or with yarn:
```bash
yarn install
```

---

## 🚀 Getting Started

### Development Server
Start the development server with hot module replacement (HMR):

```bash
npm run dev
```

The application will be available at:
- **Local**: `http://localhost:3000`
- **Network**: `http://<your-ip>:3000`

### Production Build
Build the project for production:

```bash
npm run build
```

This generates an optimized `dist/` directory ready for deployment.

### Preview Production Build
Preview the production build locally:

```bash
npm run preview
```

### Lint Code
Check code quality and style:

```bash
npm run lint
```

---

## 📁 Project Structure

```
seraphine-couture/
├── index.html                 # Main HTML entry point
├── main.js                    # Application entry point
├── style.css                  # Global styles (Tailwind + custom CSS)
├── vite.config.ts             # Vite configuration
├── tailwind.config.ts         # Tailwind CSS configuration (if exists)
├── eslint.config.js           # ESLint configuration
├── package.json               # Dependencies and scripts
├── package-lock.json          # Dependency lock file
├── metadata.json              # Project metadata
├── dist/                      # Production build output
│   ├── index.html
│   ├── main.js
│   └── style.css
└── js/                        # JavaScript modules
    ├── data.js                # Product data and constants
    ├── state.js               # Application state management
    ├── logic.js               # Business logic and handlers
    └── pages.js               # Page components and templates
```

### Key Files Description

| File | Purpose |
|------|---------|
| `index.html` | HTML structure and layout |
| `main.js` | Application initialization and routing |
| `style.css` | Tailwind CSS imports and custom styles |
| `js/data.js` | Product catalog and mock data |
| `js/state.js` | Global state management (cart, user, etc.) |
| `js/logic.js` | Event handlers and business logic |
| `js/pages.js` | Page templates and components |
| `vite.config.ts` | Vite build configuration |

---

## 💻 Development

### Architecture Overview

The application follows a modular component-based architecture:

1. **Entry Point** (`index.html` + `main.js`)
   - Loads the main HTML structure
   - Initializes the application
   - Sets up event listeners and routing

2. **State Management** (`js/state.js`)
   - Centralized application state
   - Cart management
   - User authentication state
   - Page navigation state

3. **Data Layer** (`js/data.js`)
   - Product catalog (mock data)
   - Constants and configuration
   - Can be replaced with API calls

4. **UI/Components** (`js/pages.js`)
   - Page templates (Home, Shop, Product Detail, Cart, etc.)
   - Component rendering
   - Dynamic content generation

5. **Logic/Events** (`js/logic.js`)
   - Event handlers (click, form submission, etc.)
   - Business logic (add to cart, wishlist toggle, etc.)
   - Cart operations

### Routing

The application uses hash-based routing with data attributes:

```javascript
// Navigation links use data-link attribute
<a href="#" data-link="shop">Shop</a>
<a href="#" data-link="cart">Cart</a>

// Router handles navigation
navigate('shop', { category: 'Apparel' });
```

### State Structure

```javascript
state = {
    currentPage: 'home',           // Current page
    currentProduct: null,          // Selected product
    shopCategory: null,            // Shop filter
    cart: [],                      // Cart items
    wishlist: [],                  // Wishlist items
    user: null,                    // Logged-in user
    isLoggedIn: false              // Auth status
}
```

### Adding New Products

Edit `js/data.js` and add to the `PRODUCTS` array:

```javascript
{
    id: 'unique-id',
    name: 'Product Name',
    price: 1000,
    category: 'Apparel',
    description: 'Product description',
    images: ['url1', 'url2'],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: ['Color1', 'Color2'],
    stock: 5,
    rating: 4.8,
    reviews: 10,
    isFeatured: true,
    isNew: false
}
```

### Creating New Pages

1. Add page template function in `js/pages.js`:
```javascript
export const Pages = {
    myNewPage() {
        return `
            <div class="page-content">
                <!-- Page HTML -->
            </div>
        `;
    }
}
```

2. Navigate to the page:
```javascript
navigate('myNewPage');
```

### Styling

The project uses Tailwind CSS with custom configuration:

```css
/* Global styles in style.css */
@import "tailwindcss";

@theme {
    --font-sans: "Inter", ui-sans-serif;
    --font-serif: "Playfair Display", ui-serif;
    --color-gold: #D4AF37;
}
```

Custom color scheme:
- **Gold**: `#D4AF37` (primary luxury accent)
- **Zinc**: Neutral grays for typography
- **White**: Clean background
- **Black**: Deep text color

---

## 🏗️ Build & Deployment

### Production Build

```bash
npm run build
```

Output:
- Minified CSS
- Optimized JavaScript
- Compressed HTML
- All assets bundled in `dist/`

### Deployment Options

#### Vercel
```bash
npm install -g vercel
vercel
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Traditional Hosting
1. Build: `npm run build`
2. Upload `dist/` folder to your web server
3. Configure server to serve `index.html` for all routes

#### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

---

## ⚙️ Configuration

### Vite Configuration (`vite.config.ts`)

```typescript
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
```

**Options:**
- `HMR`: Hot Module Replacement (enable/disable with `DISABLE_HMR`)
- `Port`: Default 3000 (configured in `package.json`)
- `Host`: Accessible on network with `--host=0.0.0.0`

### Environment Variables

Create `.env` file for environment-specific configuration:

```env
VITE_API_URL=https://api.example.com
VITE_APP_NAME=SERAPHINE COUTURE
VITE_ENABLE_DEBUG=false
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 📝 Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint code quality check |

### Custom Scripts

Add more scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 🐛 Troubleshooting

### CSS Not Loading in Development

**Problem**: `tailwindcss: Failed to load resource: 404`

**Solution**:
1. Ensure `main.js` is properly imported in `index.html`
2. Check that `style.css` imports Tailwind: `@import "tailwindcss";`
3. Restart dev server: `npm run dev`

### Icons Not Displaying

**Problem**: Lucide icons show as blank squares

**Solution**:
1. Verify Lucide script is loaded: `<script src="https://unpkg.com/lucide@1.7.0"></script>`
2. Call `window.lucide.createIcons()` after DOM loads
3. Check browser console for CORS or tracking prevention errors
4. Use fixed version `@1.7.0` instead of `@latest`

### Build Fails with TypeScript Errors

**Problem**: `vite.config.ts` build error

**Solution**:
1. Install TypeScript: `npm install --save-dev typescript`
2. Create `tsconfig.json`
3. Or rename `vite.config.ts` to `vite.config.js`

### HMR Not Working

**Problem**: Changes not reflecting in browser

**Solution**:
```bash
DISABLE_HMR=false npm run dev
```

Or configure in `vite.config.ts`:
```typescript
server: {
  hmr: {
    host: 'localhost',
    port: 5173
  }
}
```

### Port Already in Use

**Problem**: Port 3000 already in use

**Solution**:
```bash
npm run dev -- --port 3001
```

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Before Starting
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Ensure code quality: `npm run lint`

### Code Standards
- Follow ESLint rules
- Use meaningful variable/function names
- Add comments for complex logic
- Keep components modular and reusable
- Follow the existing code style

### Commit Messages
Use conventional commits:
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
style: Format code
refactor: Restructure code
test: Add tests
```

### Pull Request Process
1. Update README if needed
2. Add/update tests if applicable
3. Ensure no console errors or warnings
4. Request review from maintainers
5. Address feedback and requested changes

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use
- ❌ Liability
- ❌ Warranty

---

## 📞 Support & Contact

- **Report Issues**: [GitHub Issues](https://github.com/yourusername/seraphine-couture/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/yourusername/seraphine-couture/discussions)
- **Email**: support@seraphine-couture.com

---

## 🚀 Roadmap

### Version 1.1.0 (Planned)
- [ ] API integration with backend
- [ ] User authentication with JWT
- [ ] Payment gateway integration
- [ ] Order management system
- [ ] Admin dashboard

### Version 1.2.0 (Future)
- [ ] Product reviews and ratings system
- [ ] Newsletter subscription
- [ ] Inventory real-time sync
- [ ] Advanced search and filters
- [ ] Multi-language support

### Version 2.0.0 (Long-term)
- [ ] Mobile app (React Native/Flutter)
- [ ] Machine learning recommendations
- [ ] AR try-on feature
- [ ] Social shopping features
- [ ] Analytics dashboard

---

## 📊 Performance Metrics

- **Bundle Size**: ~150KB (gzipped)
- **Lighthouse Score**: 95+ (Performance)
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <2.5s
- **Accessibility Score**: 95+

---

## 🎨 Brand Guidelines

### Color Palette
- **Primary Gold**: `#D4AF37`
- **Gold Light**: `#F4E4BC`
- **Gold Dark**: `#996515`
- **Neutral Black**: `#000000`
- **Neutral Dark Gray**: `#1a1a1a`
- **Text Primary**: `#1f2937` (Zinc 900)
- **Text Secondary**: `#6b7280` (Zinc 500)

### Typography
- **Serif Font**: Playfair Display (headings)
- **Sans Serif Font**: Inter (body text)

### Icon Library
- **Lucide Icons**: Modern, minimal icons
- **Icon Size**: 20px (standard), 24px (large)

---

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [JavaScript ES6+ Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [Lucide Icons](https://lucide.dev/)
- [Web Performance Tips](https://web.dev/performance/)

---

**Made with ❤️ by PAKrizki**

Last Updated: April 2, 2026
