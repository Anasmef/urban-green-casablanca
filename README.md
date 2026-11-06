# Urban Green Casablanca 🌿

### Cartographie et comparaison du NDVI à Casablanca (2024–2025)

**Mini-projet de télédétection et de géomatique** réalisé avec Google Earth Engine et QGIS. L'objectif est d'explorer la distribution spatiale d'un indice de végétation à Casablanca et de comparer deux périodes saisonnières équivalentes, sans assimiler directement les variations du NDVI à des changements de superficie des espaces verts.

## Aperçu des cartes

| NDVI — 2024 | NDVI — 2025 |
|---|---|
| ![Distribution du NDVI en 2024](maps/casablanca_ndvi_2024.png) | ![Distribution du NDVI en 2025](maps/casablanca_ndvi_2025.png) |

![Variation spatiale du NDVI entre 2024 et 2025](maps/casablanca_delta_ndvi_2024_2025.png)

> Les images ci-dessus doivent être ajoutées au dossier `maps/` avec ces noms exacts. Elles sont issues des mises en page QGIS, pas des images de démonstration.

## 1. Contexte et objectifs

La végétation urbaine contribue à la qualité environnementale des villes. Les images satellitaires permettent de décrire sa répartition et d'examiner des variations de réponse spectrale entre périodes.

Cette étude exploratoire vise à :

- produire deux cartes du **NDVI** pour les périodes **avril–septembre 2024** et **avril–septembre 2025** ;
- calculer des statistiques descriptives sur l'unité administrative de Casablanca ;
- comparer les deux périodes à partir des **pixels valides communs** ;
- cartographier la différence `NDVI 2025 − NDVI 2024` ;
- présenter la méthode et ses limites de manière reproductible.

## 2. Zone d'étude

L'emprise est l'unité administrative **Casablanca**, sélectionnée dans **FAO GAUL 2025 — niveau 2** (Maroc, `GAUL2_NAME = Casablanca`, `ISO3_CODE = MAR`). La région de niveau 1 indiquée dans les attributs est **Grand Casablanca-Settat**.

- Surface géométrique de cette unité selon GAUL : **21 930,48 ha**.
- Cette emprise administrative **n'est pas équivalente à une délimitation exhaustive des surfaces urbanisées**.
- Les pixels d'eau et ceux éliminés par le masque ne sont pas compris dans les superficies analysables.

## 3. Données et outils

| Donnée / outil | Rôle | Détails |
|---|---|---|
| [Sentinel-2 Level-2A SR Harmonized](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED) | Imagerie multispectrale | Collection `COPERNICUS/S2_SR_HARMONIZED` ; bandes B4 (rouge) et B8 (proche infrarouge), 10 m |
| [FAO GAUL 2025, niveau 2](https://developers.google.com/earth-engine/datasets/catalog/FAO_GAUL_2025_level2) | Limite administrative | Collection `FAO/GAUL/2025/level2` |
| [Google Earth Engine](https://code.earthengine.google.com/) | Traitement | JavaScript : filtres, masque SCL, NDVI, statistiques, export |
| [QGIS](https://qgis.org/) | Cartographie | Mise en page des trois cartes et légendes |

**Périodes d'observation** : du 1er avril au 30 septembre de chaque année, avec date de fin exclusive au 1er octobre dans Earth Engine. **Nombre de scènes après les filtres initiaux** : 33 en 2024 et 35 en 2025 (ce nombre n'est pas un décompte d'observations sans nuages par pixel).

## 4. Méthodologie

1. Sélection de l'unité administrative Casablanca dans FAO GAUL 2025.
2. Filtrage de Sentinel-2 SR Harmonized par emplacement, période et couverture nuageuse de scène inférieure à 60 %.
3. Masquage selon la bande **SCL**, en conservant les classes **2 (pixels sombres), 4 (végétation) et 5 (sols nus / non végétalisés)** et en excluant notamment eau, ombres de nuages, nuages, pixels non classés et neige. La bande SCL est fournie à 20 m ; son utilisation avec les bandes à 10 m implique un rééchantillonnage lors des traitements.
4. Conversion des bandes optiques en réflectance par multiplication par `0.0001`.
5. Calcul du NDVI **pour chaque image**, selon :

   \[
   NDVI = \frac{B8 - B4}{B8 + B4}
   \]

6. Calcul de la **médiane temporelle des images NDVI** pour chaque période et chaque pixel. Il ne s'agit pas du NDVI calculé après médiane des bandes.
7. Calcul de la moyenne, de la médiane et de la surface analysable en 2025. Répartition descriptive des pixels valides en classes : **faible (< 0,2)**, **intermédiaire (0,2 à < 0,4)** et **élevé (≥ 0,4)**. Ces seuils ne sont **pas** une classification validée d'occupation du sol.
8. Pour la comparaison, restriction aux **pixels valides dans les deux périodes** puis calcul : `ΔNDVI = NDVI_2025 − NDVI_2024`.
9. Export GeoTIFF / CSV / GeoJSON depuis Earth Engine, puis cartographie avec QGIS.

## 5. Résultats

### 5.1. Description du NDVI en 2025

| Indicateur | Valeur |
|---|---:|
| NDVI moyen (pixels valides 2025) | **0,1488** |
| NDVI médian (pixels valides 2025) | **0,1210** |
| Surface analysable 2025 | **21 892,38 ha** |
| Surface administrative GAUL | **21 930,48 ha** |

| Classe NDVI en 2025 | Surface (ha) | Proportion des pixels analysables |
|---|---:|---:|
| Faible (< 0,2) | 16 941,18 | 77,38 % |
| Intermédiaire (0,2 à < 0,4) | 4 061,23 | 18,55 % |
| Élevé (≥ 0,4) | 889,97 | 4,07 % |
| **Total** | **21 892,38** | **100,00 %** |

La prédominance de valeurs faibles suggère qu'une grande partie de la surface analysable présente une faible réponse végétale pendant la période étudiée. **Elle ne signifie pas que 77,38 % de Casablanca est bâtie** : les sols nus et d'autres surfaces peuvent aussi présenter un NDVI faible.

### 5.2. Comparaison 2024–2025

Les moyennes ci-dessous ont été recalculées sur les **mêmes 21 882,84 ha de pixels valides communs**, ce qui les distingue légèrement de la moyenne 2025 calculée sur tous les pixels valides de 2025.

| Indicateur, pixels communs | 2024 | 2025 |
|---|---:|---:|
| NDVI moyen | **0,1431** | **0,1488** |
| NDVI médian | **0,1132** | **0,1210** |

- **Variation moyenne ΔNDVI : +0,0057** unité NDVI.
- **Médiane de la variation pixel par pixel : +0,0040** unité NDVI.
- **Surface commune analysable : 21 882,84 ha**.

La moyenne du NDVI est donc **légèrement plus élevée en 2025** sur les pixels comparables. La différence reste faible et ne démontre, à elle seule, ni une augmentation de la surface végétalisée ni un changement durable de couverture du sol.

### 5.3. Lecture de la carte de variation

Sur la carte `ΔNDVI`, les teintes rouges indiquent une baisse de l'indice, les teintes vertes une hausse, et les teintes proches du blanc une faible variation. La représentation est volontairement bornée entre **−0,3 et +0,3** ; les valeurs dépassant ces bornes sont saturées visuellement, mais pas supprimées du raster.

## 6. Limites et précautions

- **NDVI ≠ couverture végétale certifiée** : un indice spectral ne remplace pas une classification de l'occupation du sol ni une validation de terrain.
- **Saisonnalité et météo** : les écarts entre années peuvent dépendre de la pluie, de la sécheresse, de la phénologie ou des dates exactes des images disponibles.
- **Observations inégales** : 33 et 35 scènes filtrées ne garantissent ni la même densité ni les mêmes dates d'observation pour chaque pixel.
- **Masque simplifié** : la sélection SCL peut conserver certaines contaminations résiduelles ou exclure des observations utilisables ; elle masque également l'eau.
- **Résolution** : bandes rouge/NIR à 10 m, mais classification SCL à 20 m ; petits arbres et espaces verts peuvent être mélangés à d'autres surfaces.
- **Emprise** : l'unité administrative inclut des secteurs non nécessairement urbanisés.
- **Deux saisons uniquement** : une variation interannuelle ponctuelle ne démontre pas une tendance à long terme ni une relation de cause à effet.
- **Seuils et palette** : les classes NDVI sont exploratoires ; l'échelle de variation −0,3/+0,3 relève de la visualisation.

## 7. Reproduire l'analyse

1. Disposer d'un compte autorisé à utiliser [Google Earth Engine](https://code.earthengine.google.com/).
2. Ouvrir le script JavaScript du projet : `gee/urban_green_casablanca.js`.
3. Vérifier les dates, la collection Sentinel-2, la sélection FAO GAUL et les paramètres du masque.
4. Cliquer sur **Run** puis consulter la **Console** pour les statistiques et les graphiques.
5. Dans **Tasks**, lancer les exports vers le dossier Google Drive `UrbanGreenCasablanca`.
6. Ouvrir les rasters et la limite administrative dans **QGIS**, puis charger le projet `qgis/urban_green_casablanca.qgz` si les chemins des données sont disponibles.
7. Pour comparer les deux cartes annuelles, utiliser la **même rampe et les mêmes bornes** (−0,2 à 0,8). Pour la carte de variation, utiliser une palette divergente centrée sur zéro.

## 8. Organisation du dépôt

```text
urban-green-casablanca/
├── README.md
├── gee/
│   └── urban_green_casablanca.js
├── maps/
│   ├── casablanca_ndvi_2024.png
│   ├── casablanca_ndvi_2025.png
│   └── casablanca_delta_ndvi_2024_2025.png
├── data/
│   ├── casablanca_admin_ndvi_classes_2025.csv
│   └── casablanca_admin_boundary_2025.geojson
└── qgis/
    └── urban_green_casablanca.qgz
```

Les GeoTIFF sources peuvent être conservés à part si leur poids rend le dépôt GitHub inutilement volumineux. Le projet QGIS doit utiliser des chemins relatifs pour être facilement réouvert.

## 9. Perspectives

- Comparer davantage d'années et de saisons.
- Étudier les précipitations et la température pour contextualiser les variations.
- Définir des secteurs urbains d'intérêt (parcs, tissus bâtis) et réaliser une validation visuelle ou terrain.
- Tester une classification de l'occupation du sol et évaluer son exactitude.

## 10. Références et crédits

- **Copernicus / ESA**, [Sentinel-2 Surface Reflectance Harmonized — catalogue Google Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED).
- **FAO (2025)**, [Global Administrative Unit Layers (GAUL), niveau 2](https://developers.google.com/earth-engine/datasets/catalog/FAO_GAUL_2025_level2), **CC BY 4.0** (respecter les conditions d'attribution).
- Traitements : Google Earth Engine (JavaScript). Cartographie : QGIS.

---

**Nature du projet :** étude exploratoire de télédétection réalisée dans le cadre d'un portfolio en géomatique ; elle n'utilise pas de modèle d'intelligence artificielle et ne revendique pas une expertise en GeoAI.
