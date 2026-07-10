/**
 * Sentinel-3 & Sentinel-2 Water Quality Indices Module
 * Developed by Dr. Semion Polinov
 * 
 * Provides calibrated functions to compute Turbidity, Chlorophyll-a, and Algal Bloom.
 */

/**
 * 1. Turbidity (Алгоритм Dogliotti / Nechad)
 * Рассчитывает мутность. Для S2 использует B4, для S3 — Oa10.
 * Формула: T = (A * rho) / (1.0 - (rho / C))
 */
exports.computeTurbidity = function(image, satelliteType) {
  var redChannel = (satelliteType === 'S3') ? 'Oa10' : 'B4';
  var red = image.select(redChannel); 
  
  var A = 371.8;
  var C = 0.174;
  
  var turbidity = red.expression(
    '(A * rho) / (1.0 - (rho / C))', {
      'rho': red,
      'A': A,
      'C': C
    }
  ).rename('Turbidity_Dogliotti');

  return image.addBands(turbidity);
};

/**
 * 2. Chlorophyll-a (Индекс NdCI)
 * Рассчитывает концентрацию хлорофилла-а.
 * Для S2 использует Red Edge/Red (B5/B4), для S3 — Oa11/Oa10.
 */
exports.computeChlorophyll = function(image, satelliteType) {
  var channels = (satelliteType === 'S3') ? ['Oa11', 'Oa10'] : ['B5', 'B4'];
  var ndci = image.normalizedDifference(channels).rename('NdCI');
  return image.addBands(ndci);
};

/**
 * 3. Algal Bloom Index (ABI)
 * Фиксирует высокую отражательную способность биомассы на поверхности воды.
 * Для S2 использует NIR/Red (B8/B4), для S3 — Oa17/Oa10.
 */
exports.computeAlgalBloom = function(image, satelliteType) {
  var channels = (satelliteType === 'S3') ? ['Oa17', 'Oa10'] : ['B8', 'B4'];
  var abi = image.normalizedDifference(channels).rename('Algal_Bloom_Index');
  return image.addBands(abi);
};
