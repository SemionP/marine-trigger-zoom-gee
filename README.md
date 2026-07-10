# marine-trigger-zoom-gee
# Marine Trigger & Zoom Framework for Google Earth Engine (GEE)

An automated, multi-sensor open-source framework designed for coastal and marine environmental monitoring. It leverages the high temporal resolution of **Sentinel-3 (OLCI)** for daily macro-surveillance and automatically triggers high-spatial resolution asset deployment via **Sentinel-2 (MSI)** when water quality anomalies are detected.

## Core Indices Included
1. **Turbidity**: Calibrated Dogliotti/Nechad algorithm.
2. **Chlorophyll-a**: Normalized Difference Chlorophyll Index (NdCI).
3. **Algal Bloom Index**: Surface biomass detection index.

## Architecture (Trigger & Zoom Concept)
* **Macro-Surveillance (Sentinel-3)**: Daily ocean-wide scans at 300m resolution to calculate baseline water quality trends.
* **Anomaly Evaluation**: Automated GEE server-side threshold checks.
* **Micro-Analysis (Sentinel-2)**: Automated high-resolution (10m) "Zoom" activation over flagged anomaly hotspots to pinpoint localized pollution sources.

---

## Quick Start Example (GEE Code Editor)

To run this framework, save the `water_quality.js` code into your GEE repository as a module named `water_quality`, then use the following pipeline script:

```javascript
// 1. Load the module (Replace with your actual GEE repository path)
var wq = require('users/your_gee_username/default:water_quality');

// 2. Define Area of Interest (AOI)
var aoi = ee.Geometry.Point([34.9, 32.8]).buffer(20000); 
Map.centerObject(aoi, 10);

var ALARM_THRESHOLD = 0.15; 

// --- STEP 1: DAILY SURVEILLANCE WITH SENTINEL-3 ---
var s3Collection = ee.ImageCollection('COPERNICUS/S3/OLCI')
  .filterBounds(aoi)
  .filterDate('2026-06-01', '2026-07-11') 
  .sort('system:time_start', false); 

var s3Image = ee.Image(s3Collection.first()).clip(aoi);
var s3NdCI = s3Image.normalizedDifference(['Oa11', 'Oa10']).rename('NdCI_S3');

var stats = s3NdCI.reduceRegion({
  reducer: ee.Reducer.max(),
  geometry: aoi,
  scale: 300,
  maxPixels: 1e9
});
var maxNdCI = ee.Number(stats.get('NdCI_S3'));

print('Sentinel-3 Scan Complete.');
print('Max NdCI detected:', maxNdCI);

// --- STEP 2: AUTOMATED CROSS-SENSOR TRIGGER ---
var renderResult = ee.Algorithms.If(
  maxNdCI.gt(ALARM_THRESHOLD),
  
  // IF THRESHOLD EXCEEDED: Trigger High-Res Sentinel-2 Zoom
  function() {
    print('🚨 ANOMALY DETECTED! Fetching high-resolution Sentinel-2 assets...');
    
    var s2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(aoi)
      .filterDate('2026-06-01', '2026-07-11')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10)) 
      .sort('system:time_start', false); 
      
    var s2Image = ee.Image(s2Collection.first()).divide(10000).clip(aoi);
    var s2NdCI = s2Image.normalizedDifference(['B5', 'B4']).rename('NdCI_S2');
    
    Map.addLayer(s2NdCI, {min: -0.1, max: 0.4, palette: ['blue', 'yellow', 'red']}, '🚨 ZOOM: Sentinel-2 High-Res NdCI');
    return s2NdCI;
  },
  
  // IF NORMAL: Stay on macro-monitoring
  function() {
    print('✅ Water quality stable. High-res target acquisition skipped.');
    return s3NdCI;
  }
);

Map.addLayer(s3NdCI, {min: -0.1, max: 0.3, palette: ['purple', 'blue', 'cyan']}, 'OVERVIEW: Sentinel-3 Daily NdCI');
