# Understanding Form Analytics Charts

A comprehensive guide to visualizing and analyzing your form submission data.

## Table of Contents

1. [Overview](#overview)
2. [Accessing Analytics](#accessing-analytics)
3. [Chart Types](#chart-types)
4. [Customizing Your View](#customizing-your-view)
5. [Accessibility Features](#accessibility-features)
6. [Interpreting Your Data](#interpreting-your-data)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Form Analytics Charts feature provides powerful data visualization capabilities to help you
understand patterns, trends, and distributions in your form submissions. Instead of manually
reviewing each submission, you can quickly identify:

- **Popular choices** in select/radio fields
- **Trends over time** in date fields
- **Statistical summaries** for numeric fields
- **Distribution patterns** across all field types

### Key Benefits

- ✅ **Quick Insights**: Visualize hundreds of submissions at a glance
- ✅ **Interactive**: Filter data, toggle charts, and explore details
- ✅ **Accessible**: WCAG AA compliant with data table alternatives
- ✅ **Responsive**: Works seamlessly on desktop, tablet, and mobile

---

## Accessing Analytics

### Step 1: Navigate to Your Form

1. Log in to your account
2. Go to **Tools** → **Form Builder**
3. Find your form in the forms list
4. Click on the form name to open it

### Step 2: Open Analytics View

1. In the form detail view, click the **Analytics** tab (or navigate to the analytics page)
2. The analytics dashboard will display two main sections:
   - **Submissions Table** (top): Detailed list of all submissions
   - **Charts Dashboard** (bottom): Visual analytics for each field

### What You'll See

- **All Fields**: By default, all fields with data are displayed as charts
- **Real-Time Updates**: Charts update automatically when you filter the submissions table
- **Empty State**: If a form has no submissions, you'll see a "No data available" message

---

## Chart Types

Different field types are displayed with different chart types optimized for that data.

### 1. Bar Chart

**Used For:** SELECT, RADIO, CHECKBOX fields

**What It Shows:**

- Distribution of responses across all available options
- Count and percentage for each option
- Most and least popular choices

**Example:**

```
Favorite Color (Bar Chart)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Blue    ████████████ 45 (45%)
Red     ████████ 30 (30%)
Green   █████ 15 (15%)
Yellow  ██ 10 (10%)
```

**How to Read:**

- Longer bars = more responses
- Hover over bars to see exact count and percentage
- Use this to identify the most popular options

### 2. Line Chart

**Used For:** DATE, DATETIME fields, NUMBER fields (trends)

**What It Shows:**

- Submissions over time
- Peak submission periods
- Trends and patterns

**Example:**

```
Submissions Over Time (Line Chart)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ╱╲
   ╱  ╲    ╱╲
  ╱    ╲  ╱  ╲
 ╱      ╲╱    ╲
Mon Tue Wed Thu Fri
```

**How to Read:**

- X-axis: Time periods (day, week, or month)
- Y-axis: Number of submissions
- Peaks indicate busy periods
- Use this to identify submission patterns

### 3. Pie Chart

**Used For:** TOGGLE fields, binary choices

**What It Shows:**

- Proportional distribution
- Percentage breakdown
- Visual comparison of segments

**Example:**

```
Newsletter Subscription (Pie Chart)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ┌─────────┐
  │   70%   │ Yes
  │    30%  │ No
  └─────────┘
```

**How to Read:**

- Larger segments = higher percentage
- Click segments to highlight
- Use this for binary or limited-choice questions

### 4. Stat Card

**Used For:** NUMBER, TEXT, TEXTAREA, EMAIL fields

**What It Shows:**

- Key statistics: Average, Median, Min, Max
- Standard deviation
- Total count of responses

**Example:**

```
Age (Stat Card)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Average:    35.2
Median:     34.0
Min:        18
Max:        72
Std Dev:    12.5
Count:      150 responses
```

**How to Read:**

- **Average**: Mean value (sum ÷ count)
- **Median**: Middle value (50th percentile)
- **Min/Max**: Lowest and highest values
- **Std Dev**: Spread of data (higher = more variation)

---

## Customizing Your View

### Filtering Data

**Filter Submissions Table:**

1. Use the search box at the top of the submissions table
2. Type keywords to filter submissions
3. Charts automatically update to show only filtered data

**Example Use Cases:**

- Filter by date range to see specific period trends
- Search for specific values to analyze subset patterns
- Combine filters to drill down into data

### Toggling Field Visibility

**Show/Hide Charts:**

1. Click the **Configure Fields** button (⚙️ icon)
2. In the dialog, check/uncheck fields to show/hide
3. Your preferences are saved automatically
4. Next time you visit, your selections are remembered

**Tips:**

- Hide fields you don't need to focus on important metrics
- Show only top 5-10 fields for better performance
- Toggle back anytime to see all data

### Switching Between Chart and Table View

**For Each Chart:**

1. Find the **Show Data Table** button on any chart
2. Click to switch between chart and data table view
3. Data table shows the same information in tabular format
4. Useful for:
   - Screen reader users
   - Exact data values
   - Copying data
   - Accessibility

---

## Accessibility Features

This analytics dashboard is designed to be fully accessible following WCAG AA standards.

### Screen Reader Support

**What's Included:**

- **Descriptive ARIA labels**: Every chart has a detailed text description
- **Hidden data tables**: Screen readers can access tabular data for all charts
- **Live regions**: Dynamic updates are announced to screen readers
- **Semantic HTML**: Proper headings, regions, and landmarks

**How to Use with Screen Reader:**

1. Navigate to the charts dashboard
2. Use heading navigation to jump between charts (H3 headings)
3. Each chart has a region with descriptive label
4. Access hidden data table alternative for detailed data
5. Use toggle button to switch to visible table view

### Keyboard Navigation

**All Features Accessible via Keyboard:**

- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and toggles
- **Escape**: Close dialogs and modals
- **Arrow Keys**: Navigate within tables and dropdowns

**Quick Tips:**

- Start from the top and tab through elements
- Use "Configure Fields" button with Enter key
- Toggle chart/table view with keyboard
- All interactions are keyboard accessible

### High Contrast Mode

**Automatically Supported:**

- Charts render properly in high contrast mode
- Text remains readable
- Interactive elements remain visible
- No loss of functionality

### Data Table Alternatives

**Every Chart Has Two Views:**

1. **Visual Chart** (default): Graphical representation
2. **Data Table**: Same data in accessible table format

**To Switch Views:**

- Click "Show Data Table" button on any chart
- Table includes proper headers and scope attributes
- Screen readers navigate tables easily
- Copy-paste friendly format

---

## Interpreting Your Data

### Common Patterns to Look For

#### 1. Skewed Distributions (Bar Charts)

**What It Means:**

- One option significantly more popular than others
- Clear preference or bias in responses

**Example:**

```
Preferred Contact Method:
Email:  ████████████████ 80%
Phone:  ███ 15%
Mail:   █ 5%
```

**Action:** Focus resources on email communication

#### 2. Bimodal Distributions (Stat Cards)

**What It Means:**

- Two distinct groups in your data
- Data has two peaks

**Example:**

```
Age Distribution:
Average: 35
Median: 28 (significantly different!)
→ Suggests two age groups: young adults and middle-aged
```

**Action:** Segment your audience into two groups

#### 3. Seasonal Trends (Line Charts)

**What It Means:**

- Submissions vary by time period
- Predictable patterns

**Example:**

```
Submissions peak on:
- Mondays (start of week)
- First week of month
- End of quarter
```

**Action:** Schedule follow-ups during slow periods

#### 4. Outliers (Stat Cards)

**What It Means:**

- Min/Max values very different from average
- Unusual or extreme responses

**Example:**

```
Response Time:
Average: 5 minutes
Max: 240 minutes (4 hours!)
→ One person took very long to complete
```

**Action:** Investigate outliers for data quality issues

### Statistical Concepts Simplified

#### Average vs. Median

**Average (Mean):**

- Sum of all values ÷ count
- Affected by extreme values (outliers)
- Use when: Data is evenly distributed

**Median:**

- Middle value when sorted
- Not affected by outliers
- Use when: Data has extreme values

**Example:**

```
Salaries: $30k, $35k, $40k, $45k, $1M
Average: $230k (skewed by $1M)
Median: $40k (more representative)
→ Median is better here!
```

#### Standard Deviation

**What It Measures:**

- Spread or variation in data
- How far values deviate from average

**Interpretation:**

- **Low Std Dev** (< 10% of average): Consistent responses
- **Medium Std Dev** (10-30%): Normal variation
- **High Std Dev** (> 30%): Highly varied responses

**Example:**

```
Ages:
Average: 30, Std Dev: 2 → Most people 28-32 (very consistent)
Average: 30, Std Dev: 15 → Ages range from 15-45 (varied)
```

#### Percentages in Distributions

**How to Read:**

- **Majority** (> 50%): More than half chose this
- **Plurality** (largest %): Most popular choice
- **Minority** (< 25%): Less common choice

---

## Troubleshooting

### Charts Not Displaying

**Possible Causes:**

1. **No Submissions Yet**
   - **Solution**: Submit test data or wait for real submissions
   - **Indicator**: "No data available" message

2. **Fields Hidden**
   - **Solution**: Click "Configure Fields" and enable fields
   - **Indicator**: Charts dashboard empty but data exists

3. **Filters Too Restrictive**
   - **Solution**: Clear filters in submissions table
   - **Indicator**: Table shows "0 results"

### Charts Show Incorrect Data

**Troubleshooting Steps:**

1. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Clears stale cached data

2. **Check Filters**
   - Remove all filters from submissions table
   - Verify charts update with all data

3. **Verify Field Types**
   - Wrong chart type? Field type may have changed
   - Check form schema for field type

### Performance Issues

**If Charts Load Slowly:**

1. **Hide Unused Fields**
   - Use "Configure Fields" to show only needed charts
   - Reduces rendering time

2. **Use Data Table View**
   - Click "Show Data Table" for faster view
   - No rendering of complex charts

3. **Filter Data**
   - Reduce dataset size with filters
   - Analyze smaller time periods

**Recommended Limits:**

- **Optimal**: < 1,000 submissions
- **Good**: 1,000 - 5,000 submissions
- **Slow**: > 5,000 submissions (consider filtering)

### Accessibility Issues

**Screen Reader Not Announcing:**

1. Ensure screen reader is active
2. Navigate to chart region
3. Use heading navigation (H key)
4. Access hidden data table alternative

**Keyboard Navigation Not Working:**

1. Ensure page has focus (click anywhere)
2. Use Tab key to navigate
3. Use Enter/Space to activate buttons
4. Escape key closes dialogs

**High Contrast Mode Issues:**

1. Check browser/OS high contrast settings
2. Charts should adapt automatically
3. Report issues if elements are invisible

---

## Tips for Better Analytics

### 1. Design Forms with Analytics in Mind

**Best Practices:**

- Use SELECT/RADIO for multiple choice (gets bar charts)
- Use NUMBER fields for numeric data (gets stat cards)
- Add DATE fields to track submission trends
- Limit TEXT fields (harder to visualize)

### 2. Collect Consistent Data

**Ensure Quality:**

- Use validation to prevent invalid data
- Make important fields required
- Provide clear options (not "Other" for everything)
- Use consistent date formats

### 3. Analyze Regularly

**Establish Routine:**

- Check analytics weekly or monthly
- Look for trend changes
- Identify issues early
- Adjust forms based on patterns

### 4. Combine with Table View

**Get Full Picture:**

- Use charts for patterns
- Use table for details
- Filter to drill down
- Export data for deeper analysis

### 5. Share Insights

**Communicate Findings:**

- Screenshot charts for reports
- Use data table for precise numbers
- Export filtered data
- Present trends to stakeholders

---

## FAQ

**Q: Can I export charts as images?** A: Currently, you can take screenshots. PDF/PNG export feature
is planned for a future release.

**Q: How often do charts update?** A: Charts update in real-time as you filter the submissions
table. The data refreshes automatically.

**Q: Can I customize chart colors?** A: Chart colors are currently fixed to ensure WCAG AA color
contrast compliance. Custom themes may be added in the future.

**Q: Why doesn't my TEXT field show a chart?** A: Text fields show statistics (character count, word
count) rather than charts, as text data is harder to visualize meaningfully.

**Q: Can I see charts for multiple forms at once?** A: Currently, analytics are per-form. A
dashboard comparing multiple forms is planned for a future release.

**Q: Do charts work offline?** A: Charts require an internet connection to load. Once loaded, they
work with cached submission data.

**Q: How do I filter by date range?** A: Use the submissions table filter to search by date. Charts
will automatically update to show filtered data.

**Q: Can I share analytics with team members?** A: Share the analytics page URL with team members
who have access to the form. They'll see the same data.

---

## Getting Help

**Need Additional Support?**

- **Documentation**: Check the main [README.md](../../README.md) for setup information
- **Report Issues**: [GitHub Issues](https://github.com/your-org/your-repo/issues)
- **Feature Requests**: Submit enhancement requests via GitHub
- **Contact Support**: Email support@yourcompany.com

---

## Version History

- **v1.0** (2025-10-06): Initial release with bar charts, line charts, pie charts, and stat cards
  - WCAG AA accessibility compliance
  - Data table alternatives
  - Keyboard navigation
  - Real-time filtering
  - Field visibility preferences

---

_This guide is part of the Form Builder documentation. For more information about creating and
managing forms, see the [Form Builder Guide](./form-builder.md)._
