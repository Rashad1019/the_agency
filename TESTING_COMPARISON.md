# Model Comparator Testing Guide

## Issue
The Model Comparator is not displaying the comparison table when two models are selected.

## Updated Code
I've added console logging to the `updateComparison()` function in `app.js` to help debug the issue.

## Manual Test Steps

1. **Open the Dashboard**: http://localhost:3000 (should be open now)

2. **Open Browser Console**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)

3. **Navigate to Model Comparator**: Scroll down or click the "Compare" navigation link

4. **Test the dropdowns**:
   - Select a model from the first dropdown (e.g., "LG - P7020NGAZ")
   - Select a different model from the second dropdown (e.g., "SAMSUNG - WT60R2000LL/TL")
   - Check the console for debug messages starting with:
     - "updateComparison called"
     - "Selected models:"
     - "Found data:"
     - "Setting comparison HTML"

5. **If the table still doesn't appear**, run this in the console:

```javascript
// Force trigger the comparison function
const select1 = document.getElementById('compareModel1');
const select2 = document.getElementById('compareModel2');

if (select1 && select2) {
    // Select specific models
    select1.value = 'P7020NGAZ';  // LG model
    select2.value = 'WT60R2000LL/TL';  // Samsung model
    
    // Manually call the function
    updateComparison();
    
    console.log('Forced comparison update');
}
```

6. **Check the result**:
   - Look at the comparison table area
   - Check the console logs for any errors
   - The table should show a grid with:
     - Brand
     - Price (with winner highlighting)
     - Rating (with winner highlighting)
     - Capacity
     - Spin Speed
     - Type
     - Has Heater
     - Listings

## Expected Console Output

When working correctly, you should see:
```
updateComparison called
Selected models: { model1: "P7020NGAZ", model2: "WT60R2000LL/TL" }
Found data: { d1: {…}, d2: {…} }
Setting comparison HTML, length: 1234
Comparison table updated successfully
```

## If It Still Doesn't Work

Run this diagnostic script in the console:

```javascript
// Diagnostic check
console.log('=== DIAGNOSTIC CHECK ===');
console.log('1. rawData loaded:', typeof rawData !== 'undefined' && rawData.length);
console.log('2. Dropdown 1 exists:', !!document.getElementById('compareModel1'));
console.log('3. Dropdown 2 exists:', !!document.getElementById('compareModel2'));
console.log('4. Comparison table exists:', !!document.getElementById('comparisonTable'));
console.log('5. Dropdown 1 value:', document.getElementById('compareModel1')?.value);
console.log('6. Dropdown 2 value:', document.getElementById('compareModel2')?.value);
console.log('7. Event listeners attached:', document.getElementById('compareModel1')?.onchange !== null);
console.log('8. Sample data check:', rawData?.[0]);
console.log('=== END DIAGNOSTIC ===');
```

## What I Fixed

1. Added comprehensive console logging to track function execution
2. Added error handling for cases where model data isn't found
3. Made the placeholder text match the HTML
4. Added validation before attempting to render the comparison

## Next Steps

After running the manual test, please let me know:
- What console messages appeared
- Whether the comparison table displayed
- Any error messages you saw

This will help me identify the exact issue!
