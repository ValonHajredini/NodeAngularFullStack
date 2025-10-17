# Theme Creation Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Accessing the Theme Designer](#accessing-the-theme-designer)
3. [Step-by-Step Theme Creation](#step-by-step-theme-creation)
4. [Applying Themes to Forms](#applying-themes-to-forms)
5. [Editing and Managing Themes](#editing-and-managing-themes)
6. [Theme Permissions](#theme-permissions)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Introduction

### What Are Themes?

Themes are customizable visual styles that control the appearance of your forms. They allow you to:

- **Customize colors** - Set primary and secondary colors for buttons, links, and accents
- **Design backgrounds** - Choose solid colors, gradients, or upload custom images
- **Select fonts** - Use Google Fonts for headings and body text
- **Configure styling** - Adjust border radius, padding, spacing, and more

### Why Use Custom Themes?

Custom themes enable you to:

- **Brand your forms** - Match your organization's visual identity
- **Improve user experience** - Create visually appealing, professional forms
- **Maintain consistency** - Apply the same theme across multiple forms
- **Stand out** - Differentiate your forms from generic templates

### Theme System Capabilities

- **Pre-built themes** - Choose from 9 professionally designed themes
- **Custom themes** - Create unlimited custom themes with full control
- **Real-time preview** - See changes instantly as you design
- **Responsive design** - Themes automatically adapt to mobile, tablet, and desktop
- **Easy editing** - Modify your themes anytime without affecting published forms immediately

---

## Accessing the Theme Designer

### From the Form Builder

1. **Navigate to Form Builder**
   - Log in to your account
   - Go to **Tools** > **Form Builder**
   - Click **Create New Form** or open an existing form

2. **Open Theme Dropdown**
   - Locate the **Theme** dropdown in the Form Builder toolbar (top-right area)
   - Click the dropdown to see available themes

3. **Start Theme Designer**
   - Click the **"Build Your Own Custom Color Theme"** button at the top of the dropdown
   - The Theme Designer modal will open with a 5-step wizard

---

## Step-by-Step Theme Creation

The Theme Designer wizard guides you through 5 steps to create your custom theme. Each step includes
a real-time preview so you can see your changes instantly.

### Step 1: Choosing Colors

**Primary Color**

- Used for main buttons, primary actions, and links
- Click the color picker to select your brand's primary color
- Enter a hex code (e.g., `#3B82F6`) or use the visual picker
- **Tip:** Choose a color with good contrast against white backgrounds

**Secondary Color**

- Used for secondary buttons, accents, and highlights
- Should complement your primary color
- **Tip:** Use an analogous or complementary color for visual harmony

**Accessibility Considerations**

- Ensure colors meet WCAG AA contrast standards (4.5:1 ratio for text)
- Test colors with a contrast checker tool
- Avoid using only color to convey information

**Example Color Combinations:**

- **Professional:** Primary #2563EB (blue), Secondary #10B981 (green)
- **Vibrant:** Primary #DC2626 (red), Secondary #F59E0B (orange)
- **Elegant:** Primary #6366F1 (indigo), Secondary #8B5CF6 (purple)

### Step 2: Setting Background

Choose how your form background appears:

**Solid Color Background**

- Select a single color for the entire form background
- Best for clean, minimalist designs
- **Tip:** Use light colors (white, light gray) for readability

**Linear Gradient Background**

- Create a smooth color transition across the form
- Configure gradient angle (0-360 degrees):
  - `0°` - Vertical (top to bottom)
  - `45°` - Diagonal
  - `90°` - Horizontal (left to right)
  - `135°` - Diagonal (bottom-left to top-right)
- Uses your primary and secondary colors
- **Tip:** Keep angle subtle (45° or 135°) for professional look

**Radial Gradient Background**

- Create a circular color transition emanating from a point
- Configure position (center, top-left, top-right, bottom-left, bottom-right)
- Best for eye-catching, modern designs
- **Tip:** Use center position for balanced appearance

**Image Upload** _(Future Enhancement)_

- Upload custom background images
- Supported formats: JPG, PNG, WebP
- Recommended size: 1920x1080 or larger
- File size limit: 5MB

### Step 3: Selecting Fonts

**Google Fonts Integration**

- Access 1000+ professional fonts from Google Fonts
- Fonts load automatically when users view your form
- No additional setup required

**Heading Font**

- Used for form titles, section headings, and labels
- Choose a bold, readable font
- **Popular choices:** Montserrat, Poppins, Roboto, Open Sans

**Body Font**

- Used for input fields, descriptions, and body text
- Choose a highly readable font for extended reading
- **Popular choices:** Open Sans, Lato, Roboto, Inter

**Font Size Configuration**

- Heading font size: 18-32px (default: 24px)
- Body font size: 14-18px (default: 16px)
- Sizes automatically scale for mobile devices

**Font Pairing Tips:**

- **Contrast pairing:** Serif heading + Sans-serif body (e.g., Playfair Display + Open Sans)
- **Harmonious pairing:** Same font family (e.g., Roboto + Roboto)
- **Modern pairing:** Geometric sans-serif + Humanist sans-serif (e.g., Poppins + Lato)

### Step 4: Configuring Field Styling

**Border Radius**

- Controls rounded corners on input fields and buttons
- Range: 0-32px (default: 8px)
- `0px` - Sharp corners (modern, minimalist)
- `8-12px` - Slightly rounded (professional, friendly)
- `16-32px` - Highly rounded (playful, approachable)

**Field Padding**

- Controls internal spacing inside input fields
- Range: 8-24px (default: 12px)
- Larger padding = more spacious, easier to tap on mobile
- **Tip:** Use 12-16px for optimal balance

**Border Width**

- Controls thickness of input field borders
- Range: 1-4px (default: 1px)
- Thicker borders increase visual prominence
- **Tip:** Keep at 1-2px for clean appearance

**Field Spacing**

- Controls vertical space between form fields
- Range: 8-32px (default: 16px)
- Larger spacing improves readability and reduces visual clutter

### Step 5: Preview & Save

**Real-Time Preview**

- See your complete theme applied to a sample form
- Preview shows all elements: backgrounds, inputs, buttons
- Make final adjustments before saving

**Naming Your Theme**

- Enter a descriptive name (max 50 characters)
- Use clear names like "Company Brand 2025" or "Blue Gradient Theme"
- Names help you identify themes later

**Saving Your Theme**

- Click **Save** to create your theme
- Theme is immediately available in the theme dropdown
- Theme applies to the current form automatically

**Next Steps After Saving**

- Continue editing your form with the new theme applied
- Preview your form to see the theme in action
- Publish your form to share it with users

---

## Applying Themes to Forms

### Selecting a Theme

1. **Open Theme Dropdown**
   - In Form Builder, click the **Theme** dropdown

2. **Browse Available Themes**
   - **Pre-built themes:** Ocean Blue, Sunset Orange, Forest Green, etc.
   - **Your custom themes:** Themes you've created appear at the top
   - **None (Default Styles):** Remove theme to use default styling

3. **Apply Theme**
   - Click any theme name to apply it instantly
   - Canvas updates to show theme colors and styling

### Switching Between Themes

- Switch themes anytime during form editing
- Previous theme does not affect form structure or fields
- Only visual styling changes when switching themes

### Preview Before Publishing

1. Click **Preview** button in Form Builder toolbar
2. Preview modal shows exact public form appearance
3. Verify theme rendering on different screen sizes
4. Close preview to continue editing

---

## Editing and Managing Themes

### Editing Your Own Themes

1. **Access Theme Dropdown**
   - Open any form in Form Builder
   - Click **Theme** dropdown

2. **Find Your Theme**
   - Your custom themes show an **Edit** icon (pencil) next to the name

3. **Open Theme Designer**
   - Click the **Edit** icon
   - Theme Designer modal opens with current theme values pre-filled

4. **Make Changes**
   - Modify any step (colors, background, fonts, styling)
   - Preview updates in real-time

5. **Save Changes**
   - Click **Save** on Step 5
   - All forms using this theme update automatically (after page refresh)

### Deleting Themes

- **Owner:** You can delete themes you created
- **Admin:** Admin users can delete any theme
- **Warning:** Deleting a theme affects all forms using it (they revert to default styles)

**To Delete a Theme:**

1. Contact support or use API endpoint (UI feature coming soon)
2. API: `DELETE /api/themes/:themeId`

---

## Theme Permissions

### Who Can Create Themes?

- **All authenticated users** can create custom themes
- No admin privileges required
- Each user can create unlimited themes

### Who Can Edit Themes?

- **Theme owner** - The user who created the theme
- **Admin users** - Admins can edit any theme in the system

### Who Can View/Use Themes?

- **All users** can view and apply all themes to their forms
- Themes are shared across the organization
- Users cannot edit themes they don't own (unless admin)

### Who Can Delete Themes?

- **Theme owner** - Can delete their own themes
- **Admin users** - Can delete any theme

---

## Best Practices

### Design Principles

1. **Keep it simple** - Don't use too many colors or fonts
2. **Maintain contrast** - Ensure text is readable against backgrounds
3. **Test responsiveness** - Preview on mobile, tablet, and desktop
4. **Brand consistency** - Use your organization's official colors and fonts

### Color Selection

- **Use brand colors** - Match your company's visual identity
- **Limit palette** - Stick to 2-3 main colors
- **Consider psychology** - Blue (trust), Green (growth), Red (urgency)
- **Test accessibility** - Use contrast checker tools (WebAIM, Coolors)

### Typography

- **Limit fonts** - Use maximum 2 fonts (heading + body)
- **Prioritize readability** - Choose fonts optimized for screen reading
- **Scale appropriately** - Ensure text is readable on mobile devices

### Background Design

- **Subtle gradients** - Keep angle between 45-135° for professionalism
- **Light backgrounds** - Ensure form fields stand out against background
- **Avoid busy images** - Complex backgrounds distract from form content

### Performance

- **Optimize images** - Compress background images before upload (future feature)
- **Limit animations** - Theme system uses CSS variables for instant rendering
- **Test loading time** - Verify theme applies within 300ms

---

## Troubleshooting

### Theme Not Applying

**Symptoms:**

- Theme dropdown shows theme selected, but canvas doesn't update
- Public form doesn't show theme styling

**Solutions:**

1. **Refresh page** - Hard refresh with `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache** - Settings > Privacy > Clear browsing data
3. **Check console** - Open browser DevTools (F12), check for JavaScript errors
4. **Verify theme saved** - Ensure theme was successfully saved (check dropdown)

### Preview Not Updating

**Symptoms:**

- Color changes in Theme Designer don't update preview
- Preview shows old colors or default styles

**Solutions:**

1. **Wait for debounce** - Preview updates after 300ms delay (prevents lag)
2. **Check browser support** - Use modern browser (Chrome 90+, Firefox 88+, Safari 14+)
3. **Disable browser extensions** - Ad blockers may interfere with CSS variable injection
4. **Reload modal** - Close and reopen Theme Designer modal

### Theme Save Failed

**Symptoms:**

- "Save" button clicked but modal doesn't close
- Error message appears: "Failed to save theme"

**Solutions:**

1. **Check network connection** - Ensure stable internet connection
2. **Verify authentication** - Log out and log back in
3. **Check theme name** - Ensure name is 1-50 characters, no special characters
4. **Try again** - Close modal and recreate theme

### Colors Look Different on Public Form

**Symptoms:**

- Public form colors don't match Form Builder canvas
- Colors appear washed out or incorrect

**Solutions:**

1. **Check color profile** - Ensure monitor uses sRGB color profile
2. **Verify hex codes** - Double-check hex codes match expected values
3. **Test on different devices** - Colors may vary due to screen calibration
4. **Use consistent browser** - Test in same browser used for editing

### Font Not Loading

**Symptoms:**

- Form uses default font instead of selected Google Font
- Font briefly loads then switches to default

**Solutions:**

1. **Check internet connection** - Google Fonts require network access
2. **Verify font name** - Ensure font name is spelled correctly
3. **Wait for font load** - Fonts may take 1-2 seconds to load on slow connections
4. **Try different font** - Some fonts may be unavailable or deprecated

### Performance Issues

**Symptoms:**

- Theme creation takes longer than 2 seconds
- Preview updates lag or freeze

**Solutions:**

1. **Close other tabs** - Free up browser resources
2. **Update browser** - Use latest browser version for optimal performance
3. **Disable extensions** - Temporarily disable heavy browser extensions
4. **Clear cache** - Remove old cached data
5. **Check network** - Verify low latency (<100ms) connection

---

## Additional Resources

- **Architecture Documentation:** [Theme System Architecture](../architecture/theme-system.md)
- **API Documentation:** [Theme API Endpoints](http://localhost:3000/api-docs)
- **Support:** Contact support@example.com for assistance
- **Community:** Join our forum to share themes and get feedback

---

## Feedback

We're constantly improving the theme system. Share your feedback:

- **Feature requests:** Submit via GitHub Issues
- **Bug reports:** Report bugs to support@example.com
- **Theme showcase:** Share your best themes on our community forum

---

**Version:** 1.0.0 **Last Updated:** 2025-10-17 **Author:** NodeAngularFullStack Team
