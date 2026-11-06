
/**
 * URBAN GREEN CASABLANCA
 * Étude NDVI — Avril à septembre 2025
 *
 * Données :
 * - Sentinel-2 SR Harmonized
 * - FAO GAUL 2025 niveau 2
 *
 * Résolution : 10 mètres
 * Zone : unité administrative Casablanca
 *
 * Objectif :
 * Cartographier et analyser la distribution
 * du NDVI à Casablanca.
 */

// =============================================
// 1. LIMITES ADMINISTRATIVES
// =============================================

var gaul = ee.FeatureCollection(
  'FAO/GAUL/2025/level2'
);

var casablanca = gaul
  .filter(ee.Filter.eq('ISO3_CODE', 'MAR'))
  .filter(ee.Filter.eq('GAUL2_NAME', 'Casablanca'));

var roi = casablanca.geometry();

print('Nombre de limites trouvées :', casablanca.size());

print(
  'Nom administratif :',
  casablanca.aggregate_array('GAUL2_NAME')
);

print(
  'Région administrative :',
  casablanca.aggregate_array('GAUL1_NAME')
);

var startDate = '2025-04-01';
var endDate = '2025-10-01';

Map.centerObject(roi, 11);

// =============================================
// 2. COLLECTION SENTINEL-2
// =============================================

var collection = ee.ImageCollection(
  'COPERNICUS/S2_SR_HARMONIZED'
)
  .filterBounds(roi)
  .filterDate(startDate, endDate)
  .filter(
    ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60)
  );

print('Nombre de scènes Sentinel-2 :',
  collection.size()
);

// =============================================
// 3. MASQUAGE DES NUAGES
// =============================================

function maskS2(image) {

  var scl = image.select('SCL');

  // Conserver :
  // 2 : pixels sombres
  // 4 : végétation
  // 5 : surfaces non végétalisées
  //
  // Exclure notamment :
  // 3 : ombres de nuages
  // 6 : eau
  // 7 : non classée
  // 8,9,10 : nuages et cirrus
  // 11 : neige / glace

  var valid = scl.eq(2)
    .or(scl.eq(4))
    .or(scl.eq(5));

  return image
    .updateMask(valid)
    .select(['B2', 'B3', 'B4', 'B8'])
    .multiply(0.0001)
    .copyProperties(
      image,
      ['system:time_start']
    );
}

var cleanCollection = collection.map(maskS2);

// =============================================
// 4. IMAGE SATELLITE RGB
// =============================================

var compositeRGB = cleanCollection
  .median()
  .clip(roi);

var visRGB = {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 0.3
};

Map.addLayer(
  compositeRGB,
  visRGB,
  'Sentinel-2 RGB 2025',
  false
);

// =============================================
// 5. CALCUL DU NDVI
// =============================================

// NDVI = (B8 - B4) / (B8 + B4)
//
// B8 : proche infrarouge
// B4 : rouge

var ndviCollection = cleanCollection.map(
  function(image) {

    var nir = image.select('B8');
    var red = image.select('B4');

    var somme = nir.add(red);

    var ndviImage = image.expression(
      '(NIR - RED) / (NIR + RED)',
      {
        NIR: nir,
        RED: red
      }
    )
    .rename('NDVI')
    .updateMask(somme.neq(0));

    return ndviImage.copyProperties(
      image,
      ['system:time_start']
    );
  }
);

// Médiane temporelle des NDVI

var ndvi = ndviCollection
  .median()
  .clip(roi);

// =============================================
// 6. VISUALISATION NDVI
// =============================================

var ndviStyle = {
  min: -0.2,
  max: 0.8,
  palette: [
    '#8b3b2e',
    '#d98c51',
    '#f2dfa2',
    '#aed779',
    '#4e9a51',
    '#176439'
  ]
};

Map.addLayer(
  ndvi,
  ndviStyle,
  'NDVI Casablanca Admin 2025',
  true
);

// =============================================
// 7. CONTOUR ADMINISTRATIF
// =============================================

// Ajouter après le NDVI pour que
// la limite reste visible au-dessus.

Map.addLayer(
  casablanca.style({
    color: 'red',
    fillColor: '00000000',
    width: 2
  }),
  {},
  'Limite administrative Casablanca',
  true
);

// =============================================
// 8. STATISTIQUES NDVI
// =============================================

var stats = ndvi.reduceRegion({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.median(),
    sharedInputs: true
  }),
  geometry: roi,
  scale: 10,
  maxPixels: 1e9,
  tileScale: 4
});

print('Statistiques NDVI :', stats);

// =============================================
// 9. SURFACE ANALYSABLE
// =============================================

var pixelAreaHa = ee.Image.pixelArea()
  .divide(10000)
  .rename('area');

var validHa = ee.Number(
  pixelAreaHa
    .updateMask(ndvi.mask())
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi,
      scale: 10,
      maxPixels: 1e9,
      tileScale: 4
    })
    .get('area')
);

print(
  'Surface de pixels analysables (ha) :',
  validHa
);

// Surface administrative géométrique
var adminHa = roi.area(1).divide(10000);

print(
  'Surface administrative GAUL (ha) :',
  adminHa
);

// =============================================
// 10. CLASSES NDVI
// =============================================

var labels = [
  'NDVI faible (< 0.2)',
  'NDVI intermediaire (0.2-0.4)',
  'NDVI eleve (>= 0.4)'
];

var masks = [
  ndvi.lt(0.2),
  ndvi.gte(0.2).and(ndvi.lt(0.4)),
  ndvi.gte(0.4)
];

var classes = ee.FeatureCollection(
  labels.map(function(label, i) {

    var areaHa = ee.Number(
      pixelAreaHa
        .updateMask(masks[i])
        .reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: roi,
          scale: 10,
          maxPixels: 1e9,
          tileScale: 4
        })
        .get('area')
    );

    return ee.Feature(null, {
      classe: label,
      surface_ha: areaHa,
      part_pixels_valides_pct:
        areaHa.divide(validHa).multiply(100)
    });
  })
);

print(
  'Superficies des classes NDVI :',
  classes
);

// Vérifier la somme des pourcentages
print(
  'Somme des pourcentages :',
  classes.aggregate_sum('part_pixels_valides_pct')
);

// =============================================
// 11. GRAPHIQUE NDVI
// =============================================

var chart = ui.Chart.feature.byFeature(
  classes,
  'classe',
  'part_pixels_valides_pct'
)
.setChartType('ColumnChart')
.setOptions({
  title: 'Répartition des classes NDVI (%)',
  legend: {
    position: 'none'
  },
  hAxis: {
    title: 'Classes NDVI'
  },
  vAxis: {
    title: 'Pourcentage',
    minValue: 0,
    maxValue: 100
  },
  colors: ['#4e9a51']
});

print(chart);

// =============================================
// 12. EXPORT NDVI GEOTIFF
// =============================================

Export.image.toDrive({
  image: ndvi,
  description: 'casablanca_admin_ndvi_2025',
  folder: 'UrbanGreenCasablanca',
  fileNamePrefix: 'casablanca_admin_ndvi_2025',
  region: roi,
  scale: 10,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

// =============================================
// 13. EXPORT STATISTIQUES CSV
// =============================================

Export.table.toDrive({
  collection: classes,
  description: 'casablanca_admin_ndvi_classes_2025',
  folder: 'UrbanGreenCasablanca',
  fileNamePrefix: 'casablanca_admin_ndvi_classes_2025',
  fileFormat: 'CSV',
  selectors: [
    'classe',
    'surface_ha',
    'part_pixels_valides_pct'
  ]
});

// =============================================
// 14. EXPORT RGB GEOTIFF
// =============================================

Export.image.toDrive({
  image: compositeRGB.select([
    'B4', 'B3', 'B2'
  ]),
  description: 'casablanca_admin_rgb_2025',
  folder: 'UrbanGreenCasablanca',
  fileNamePrefix: 'casablanca_admin_rgb_2025',
  region: roi,
  scale: 10,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

// =============================================
// 15. EXPORT LIMITE ADMINISTRATIVE
// =============================================

Export.table.toDrive({
  collection: casablanca,
  description: 'casablanca_admin_boundary_2025',
  folder: 'UrbanGreenCasablanca',
  fileNamePrefix: 'casablanca_admin_boundary_2025',
  fileFormat: 'GeoJSON'
});

print('Analyse administrative terminée.');




/**
 * ETAPE 5 : COMPARAISON NDVI 2024 - 2025
 *
 * Même territoire, même saison,
 * mêmes traitements et résolution.
 */

// =============================================
// 16. COLLECTION SENTINEL-2 POUR 2024
// =============================================

var collection2024 = ee.ImageCollection(
  'COPERNICUS/S2_SR_HARMONIZED'
)
.filterBounds(roi)
.filterDate('2024-04-01', '2024-10-01')
.filter(
  ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60)
);

print(
  'Nombre de scènes Sentinel-2 en 2024 :',
  collection2024.size()
);

// Appliquer le masque déjà défini
var clean2024 = collection2024.map(maskS2);

// =============================================
// 17. CALCUL DU NDVI 2024
// =============================================

var ndvi2024Collection = clean2024.map(
  function(image) {

    var nir = image.select('B8');
    var red = image.select('B4');

    var ndviImage = image.expression(
      '(NIR - RED) / (NIR + RED)',
      {
        NIR: nir,
        RED: red
      }
    )
    .rename('NDVI')
    .updateMask(nir.add(red).neq(0));

    return ndviImage.copyProperties(
      image,
      ['system:time_start']
    );
  }
);

var ndvi2024 = ndvi2024Collection
  .median()
  .clip(roi);

// =============================================
// 18. CARTES NDVI 2024 ET 2025
// =============================================

// ndvi = NDVI 2025 déjà calculé
// dans le script précédent.

Map.addLayer(
  ndvi2024,
  ndviStyle,
  'NDVI Casablanca 2024',
  false
);

// =============================================
// 19. PIXELS COMMUNS AUX DEUX ANNEES
// =============================================

// Les comparaisons utilisent seulement
// les pixels valides en 2024 ET en 2025.

var commonMask = ndvi2024.mask()
  .and(ndvi.mask());

var ndvi2024Common = ndvi2024
  .updateMask(commonMask);

var ndvi2025Common = ndvi
  .updateMask(commonMask);

// =============================================
// 20. CALCUL DE LA DIFFERENCE
// =============================================

// Delta NDVI = NDVI 2025 - NDVI 2024

var deltaNDVI = ndvi2025Common
  .subtract(ndvi2024Common)
  .rename('Delta_NDVI');

// Couleurs :
// rouge = diminution
// clair = faible variation
// vert = augmentation

var deltaStyle = {
  min: -0.3,
  max: 0.3,
  palette: [
    '#b2182b',
    '#ef8a62',
    '#f7f7f7',
    '#a6dba0',
    '#1b7837'
  ]
};

Map.addLayer(
  deltaNDVI,
  deltaStyle,
  'Variation NDVI 2024-2025',
  true
);

// =============================================
// 21. STATISTIQUES COMPARATIVES
// =============================================

function getStats(image) {
  return image.reduceRegion({
    reducer: ee.Reducer.mean().combine({
      reducer2: ee.Reducer.median(),
      sharedInputs: true
    }),
    geometry: roi,
    scale: 10,
    maxPixels: 1e9,
    tileScale: 4
  });
}

var stats2024 = getStats(ndvi2024Common);
var stats2025 = getStats(ndvi2025Common);
var statsDelta = getStats(deltaNDVI);

print('NDVI 2024 (pixels communs) :',
  stats2024);

print('NDVI 2025 (pixels communs) :',
  stats2025);

print('Variation NDVI (pixels communs) :',
  statsDelta);

// =============================================
// 22. SURFACE REELLEMENT COMPARABLE
// =============================================

var surfaceCommune = pixelAreaHa
  .updateMask(commonMask)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 10,
    maxPixels: 1e9,
    tileScale: 4
  });

print(
  'Surface comparable entre 2024 et 2025 (ha) :',
  surfaceCommune.get('area')
);

// =============================================
// 23. GRAPHIQUE COMPARATIF
// =============================================

var comparison = ee.FeatureCollection([
  ee.Feature(null, {
    annee: '2024',
    ndvi_moyen: stats2024.get('NDVI_mean')
  }),
  ee.Feature(null, {
    annee: '2025',
    ndvi_moyen: stats2025.get('NDVI_mean')
  })
]);

var chartComparison = ui.Chart.feature.byFeature(
  comparison,
  'annee',
  'ndvi_moyen'
)
.setChartType('ColumnChart')
.setOptions({
  title: 'NDVI moyen : 2024 vs 2025',
  hAxis: {
    title: 'Année'
  },
  vAxis: {
    title: 'NDVI moyen'
  },
  legend: {
    position: 'none'
  },
  colors: ['#4e9a51']
});

print(chartComparison);

// =============================================
// 24. EXPORT NDVI 2024
// =============================================

Export.image.toDrive({
  image: ndvi2024,
  description: 'casablanca_admin_ndvi_2024',
  folder: 'UrbanGreenCasablanca',
  fileNamePrefix: 'casablanca_admin_ndvi_2024',
  region: roi,
  scale: 10,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

// =============================================
// 25. EXPORT VARIATION NDVI
// =============================================

Export.image.toDrive({
  image: deltaNDVI,
  description: 'casablanca_delta_ndvi_2024_2025',
  folder: 'UrbanGreenCasablanca',
  fileNamePrefix: 'casablanca_delta_ndvi_2024_2025',
  region: roi,
  scale: 10,
  maxPixels: 1e9,
  fileFormat: 'GeoTIFF'
});

print('Comparaison temporelle terminée.');

