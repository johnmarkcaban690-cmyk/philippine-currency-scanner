export function detectCurrency(image) {
  return {
    detected: false,
    results: [],
    totalValue: 0,
    model: 'HOG-SVM',
    status: 'Model not installed',
    image,
  }
}

export const currencyPipeline = [
  'Camera',
  'Capture Image',
  'Preprocessing',
  'Currency/Object Localization',
  'Crop Currency',
  'Resize',
  'Grayscale',
  'HOG Feature Extraction',
  'SVM Classification',
  'Denomination Detection',
  'Currency Counting',
  'Total Value Calculation',
]
