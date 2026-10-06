# Philippine Currency Scanner

React, Vite, and PWA scanner for local Philippine currency recognition with the
trained Linear HOG-SVM model. The Scan page uses the device's rear camera and
performs image processing and classification in the browser; it does not call a
Python server or cloud AI service.

## Local model

The compact browser model and class mapping are stored in `public/model/`:

- `currency_hog_svm_linear.json` contains the 16 class labels, HOG settings,
  Linear SVM coefficients, intercepts, and prediction metadata.
- `class_names.json` contains the class/index mapping.

The `.pkl` training model is intentionally not included in the React app. The
scanner resizes candidate regions to 128x128, converts them to grayscale,
computes 9-bin HOG with 8x8 pixels per cell, 2x2 cells per block and L2-Hys
normalization, then selects the highest Linear SVM decision score. That score
is a decision margin, not a probability.

Currency regions are proposed from color contrast against the image border,
then filtered by candidate size, aspect ratio, image detail, and Linear SVM
score/margin thresholds. The camera frame is not classified as a whole and
there is no default denomination when a candidate is rejected. Since the model
was trained only on currency classes, these checks reduce false positives but
cannot guarantee rejection of every possible non-currency object.

Only a successfully completed Capture that contains detections is saved to
local storage. Each saved record includes date, time, denomination counts,
subtotals, and total value; empty and failed scans are not saved.

The PWA precaches the model JSON and class mapping for offline inference after
the service worker has finished installing and caching its assets. Camera
access requires HTTPS or localhost and browser permission.

## Development

```sh
npm install
npm run dev
```

Create and preview the production PWA build with:

```sh
npm run build
npm run preview
```
