const MODEL_URL = '/model/currency_hog_svm_linear.json'
const IMAGE_SIZE = 128
const ORIENTATIONS = 9
const PIXELS_PER_CELL = 8
const CELLS_PER_BLOCK = 2
const FEATURE_COUNT = 8100
const MAX_IMAGE_EDGE = 480
const MAX_REGION_PROPOSALS = 12
const MIN_CANDIDATE_AREA = 0.01
const MAX_FRAME_AREA_RATIO = 0.75
const MIN_ASPECT_RATIO = 0.55
const MAX_ASPECT_RATIO = 2
const MIN_CANDIDATE_SIDE = 28
const SVM_SCORE_THRESHOLD = 1
const SVM_MARGIN_THRESHOLD = 1.5

let modelPromise

export const currencyPipeline = [
  'Camera',
  'Capture Image',
  'Image Preprocessing',
  'Currency Region Proposals',
  'Crop Currency Regions',
  'Resize to 128x128',
  'Grayscale',
  'HOG Feature Extraction',
  'Linear SVM Classification',
  'Denomination Detection',
  'Currency Counting',
  'Total Value Calculation',
]

function validateModel(model) {
  if (
    model?.format !== 'hog-svm-linear-v1' ||
    model.image_size?.[0] !== IMAGE_SIZE ||
    model.image_size?.[1] !== IMAGE_SIZE
  ) {
    throw new Error('The local HOG-SVM model has an unsupported format or image size.')
  }

  const hog = model.hog
  if (
    hog?.orientations !== ORIENTATIONS ||
    hog.pixels_per_cell?.[0] !== PIXELS_PER_CELL ||
    hog.pixels_per_cell?.[1] !== PIXELS_PER_CELL ||
    hog.cells_per_block?.[0] !== CELLS_PER_BLOCK ||
    hog.cells_per_block?.[1] !== CELLS_PER_BLOCK ||
    hog.block_norm !== 'L2-Hys' ||
    hog.input !== 'grayscale' ||
    hog.transform_sqrt !== false ||
    hog.feature_vector !== true
  ) {
    throw new Error('The local model HOG settings do not match the trained configuration.')
  }

  const svm = model.svm
  if (
    svm?.kernel !== 'linear' ||
    svm.feature_count !== FEATURE_COUNT ||
    !Number.isFinite(svm.C) ||
    svm.C <= 0 ||
    svm.decision_function !== 'one-vs-rest; predict argmax(score)' ||
    !Array.isArray(svm.classes) ||
    svm.classes.length !== 16 ||
    !Array.isArray(model.class_names) ||
    model.class_names.length !== svm.classes.length ||
    !model.class_names.every((name, index) => name === svm.classes[index]) ||
    !Array.isArray(svm.coefficients) ||
    svm.coefficients.length !== svm.classes.length ||
    svm.coefficients.some((row) => !Array.isArray(row) || row.length !== FEATURE_COUNT) ||
    !Array.isArray(svm.intercept) ||
    svm.intercept.length !== svm.classes.length ||
    !svm.parameters ||
    svm.parameters.penalty !== 'l2' ||
    svm.parameters.loss !== 'squared_hinge' ||
    svm.parameters.fit_intercept !== true ||
    svm.parameters.multi_class !== 'ovr'
  ) {
    throw new Error('The local HOG-SVM class names or coefficient dimensions are invalid.')
  }

  return model
}

export function loadCurrencyModel(url = MODEL_URL) {
  if (!modelPromise) {
    modelPromise = fetch(url, { cache: 'force-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to load the local HOG-SVM model (${response.status}).`)
        }
        return response.json()
      })
      .then(validateModel)
      .catch((error) => {
        modelPromise = undefined
        throw error
      })
  }
  return modelPromise
}

function grayscaleImage(imageData) {
  const { data, width, height } = imageData
  const gray = new Uint8Array(width * height)
  const rgb = new Uint8Array(width * height * 3)
  for (let pixel = 0, index = 0; pixel < gray.length; pixel += 1, index += 4) {
    rgb[pixel * 3] = data[index]
    rgb[pixel * 3 + 1] = data[index + 1]
    rgb[pixel * 3 + 2] = data[index + 2]
    gray[pixel] =
      (data[index] * 4899 +
        data[index + 1] * 9617 +
        data[index + 2] * 1868 +
        8192) >>
      14
  }
  return { gray, rgb, width, height }
}

function readScaledImage(source) {
  if (
    source &&
    Number.isInteger(source.width) &&
    Number.isInteger(source.height) &&
    source.data?.length === source.width * source.height * 4
  ) {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(source.width, source.height))
    if (scale === 1) return grayscaleImage(source)
  }

  if (!source || typeof document === 'undefined') {
    throw new Error('Image input must be ImageData or a browser image, video, or canvas.')
  }

  const sourceWidth = source.videoWidth || source.naturalWidth || source.width
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height
  if (!sourceWidth || !sourceHeight) {
    throw new Error('The captured image is empty or has not finished loading.')
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Could not create a canvas for image preprocessing.')
  context.drawImage(source, 0, 0, width, height)
  return grayscaleImage(context.getImageData(0, 0, width, height))
}

function makeResizeContributions(origin, extent) {
  const contributions = new Array(IMAGE_SIZE)
  const step = extent / IMAGE_SIZE

  for (let outputIndex = 0; outputIndex < IMAGE_SIZE; outputIndex += 1) {
    if (step < 1) {
      const position = origin + (outputIndex + 0.5) * step - 0.5
      const first = Math.max(0, Math.floor(position))
      const second = Math.min(extent - 1, first + 1)
      const fraction = Math.max(0, position - first)
      contributions[outputIndex] = [
        [first, 1 - fraction],
        [second, fraction],
      ]
      continue
    }

    const start = outputIndex * step
    const end = start + step
    const first = Math.floor(start)
    const last = Math.min(extent - 1, Math.ceil(end) - 1)
    const samples = []
    for (let index = first; index <= last; index += 1) {
      const overlap = Math.max(0, Math.min(end, index + 1) - Math.max(start, index))
      if (overlap > 0) samples.push([index, overlap / step])
    }
    contributions[outputIndex] = samples
  }

  return contributions
}

function resizeGrayCrop(image, box) {
  const xContributions = makeResizeContributions(box.x, box.width)
  const yContributions = makeResizeContributions(box.y, box.height)
  const resized = new Float64Array(IMAGE_SIZE * IMAGE_SIZE)

  for (let y = 0; y < IMAGE_SIZE; y += 1) {
    for (let x = 0; x < IMAGE_SIZE; x += 1) {
      let value = 0
      for (const [sourceY, weightY] of yContributions[y]) {
        for (const [sourceX, weightX] of xContributions[x]) {
          value +=
            image.gray[(box.y + sourceY) * image.width + box.x + sourceX] *
            weightY *
            weightX
        }
      }
      resized[y * IMAGE_SIZE + x] = value
    }
  }
  return resized
}

export function extractHogFeatures(grayPixels) {
  if (grayPixels.length !== IMAGE_SIZE * IMAGE_SIZE) {
    throw new Error(`HOG expects a ${IMAGE_SIZE}x${IMAGE_SIZE} grayscale image.`)
  }

  const cellCount = IMAGE_SIZE / PIXELS_PER_CELL
  const cellHistograms = new Float64Array(
    cellCount * cellCount * ORIENTATIONS,
  )
  const rowGradient = new Float64Array(IMAGE_SIZE * IMAGE_SIZE)
  const columnGradient = new Float64Array(IMAGE_SIZE * IMAGE_SIZE)

  for (let row = 1; row < IMAGE_SIZE - 1; row += 1) {
    for (let column = 0; column < IMAGE_SIZE; column += 1) {
      const index = row * IMAGE_SIZE + column
      rowGradient[index] = grayPixels[index + IMAGE_SIZE] - grayPixels[index - IMAGE_SIZE]
    }
  }

  for (let row = 0; row < IMAGE_SIZE; row += 1) {
    for (let column = 1; column < IMAGE_SIZE - 1; column += 1) {
      const index = row * IMAGE_SIZE + column
      columnGradient[index] = grayPixels[index + 1] - grayPixels[index - 1]
    }
  }

  for (let row = 0; row < IMAGE_SIZE; row += 1) {
    for (let column = 0; column < IMAGE_SIZE; column += 1) {
      const index = row * IMAGE_SIZE + column
      const rowValue = rowGradient[index]
      const columnValue = columnGradient[index]
      const magnitude = Math.hypot(rowValue, columnValue)
      if (!magnitude) continue

      let angle = Math.atan2(rowValue, columnValue)
      if (angle < 0) angle += Math.PI
      if (angle >= Math.PI) angle -= Math.PI
      const orientation = Math.min(
        ORIENTATIONS - 1,
        Math.floor((angle * ORIENTATIONS) / Math.PI),
      )
      const cellRow = Math.floor(row / PIXELS_PER_CELL)
      const cellColumn = Math.floor(column / PIXELS_PER_CELL)
      const histogramIndex =
        (cellRow * cellCount + cellColumn) * ORIENTATIONS + orientation
      cellHistograms[histogramIndex] += magnitude
    }
  }

  const blockCount = cellCount - CELLS_PER_BLOCK + 1
  const features = new Float32Array(FEATURE_COUNT)
  let featureIndex = 0

  for (let blockRow = 0; blockRow < blockCount; blockRow += 1) {
    for (let blockColumn = 0; blockColumn < blockCount; blockColumn += 1) {
      let squaredSum = 0
      for (let cellRow = 0; cellRow < CELLS_PER_BLOCK; cellRow += 1) {
        for (let cellColumn = 0; cellColumn < CELLS_PER_BLOCK; cellColumn += 1) {
          const cellStart =
            ((blockRow + cellRow) * cellCount + blockColumn + cellColumn) *
            ORIENTATIONS
          for (let orientation = 0; orientation < ORIENTATIONS; orientation += 1) {
            const value = cellHistograms[cellStart + orientation]
            squaredSum += value * value
          }
        }
      }

      const firstNorm = Math.sqrt(squaredSum + 1e-10)
      const block = new Float64Array(CELLS_PER_BLOCK * CELLS_PER_BLOCK * ORIENTATIONS)
      let clippedSquaredSum = 0
      let blockIndex = 0

      for (let cellRow = 0; cellRow < CELLS_PER_BLOCK; cellRow += 1) {
        for (let cellColumn = 0; cellColumn < CELLS_PER_BLOCK; cellColumn += 1) {
          const cellStart =
            ((blockRow + cellRow) * cellCount + blockColumn + cellColumn) *
            ORIENTATIONS
          for (let orientation = 0; orientation < ORIENTATIONS; orientation += 1) {
            const normalized = Math.min(
              cellHistograms[cellStart + orientation] / firstNorm,
              0.2,
            )
            block[blockIndex] = normalized
            clippedSquaredSum += normalized * normalized
            blockIndex += 1
          }
        }
      }

      const secondNorm = Math.sqrt(clippedSquaredSum + 1e-10)
      for (let index = 0; index < block.length; index += 1) {
        features[featureIndex] = block[index] / secondNorm
        featureIndex += 1
      }
    }
  }

  if (featureIndex !== FEATURE_COUNT) {
    throw new Error(`HOG produced ${featureIndex} features; expected ${FEATURE_COUNT}.`)
  }
  return features
}

export function predictHogFeatures(features, model) {
  if (features.length !== model.svm.feature_count) {
    throw new Error(
      `HOG produced ${features.length} features; the model expects ${model.svm.feature_count}.`,
    )
  }

  let bestIndex = -1
  let bestScore = Number.NEGATIVE_INFINITY
  let secondBestScore = Number.NEGATIVE_INFINITY

  for (let classIndex = 0; classIndex < model.svm.classes.length; classIndex += 1) {
    const coefficients = model.svm.coefficients[classIndex]
    let score = model.svm.intercept[classIndex]
    for (let featureIndex = 0; featureIndex < FEATURE_COUNT; featureIndex += 1) {
      score += coefficients[featureIndex] * features[featureIndex]
    }

    if (score > bestScore) {
      secondBestScore = bestScore
      bestScore = score
      bestIndex = classIndex
    } else if (score > secondBestScore) {
      secondBestScore = score
    }
  }

  return {
    className: model.svm.classes[bestIndex],
    score: bestScore,
    margin: bestScore - secondBestScore,
  }
}

function borderColor(image) {
  const borderWidth = Math.max(1, Math.round(Math.min(image.width, image.height) * 0.04))
  const red = []
  const green = []
  const blue = []

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (
        x >= borderWidth &&
        x < image.width - borderWidth &&
        y >= borderWidth &&
        y < image.height - borderWidth
      ) {
        continue
      }
      const index = (y * image.width + x) * 3
      red.push(image.rgb[index])
      green.push(image.rgb[index + 1])
      blue.push(image.rgb[index + 2])
    }
  }

  const median = (values) => {
    values.sort((first, second) => first - second)
    return values[Math.floor(values.length / 2)]
  }
  return [median(red), median(green), median(blue)]
}

function makeForegroundMask(image) {
  const background = borderColor(image)
  const mask = new Uint8Array(image.width * image.height)

  for (let pixel = 0; pixel < mask.length; pixel += 1) {
    const index = pixel * 3
    const red = image.rgb[index] - background[0]
    const green = image.rgb[index + 1] - background[1]
    const blue = image.rgb[index + 2] - background[2]
    mask[pixel] = red * red + green * green + blue * blue >= 48 * 48 ? 1 : 0
  }

  return mask
}

function dilateMask(mask, width, height) {
  const radius = Math.max(1, Math.round(Math.min(width, height) * 0.008))
  const dilated = new Uint8Array(mask.length)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let foreground = false
      for (let offsetY = -radius; offsetY <= radius && !foreground; offsetY += 1) {
        const sampleY = y + offsetY
        if (sampleY < 0 || sampleY >= height) continue
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const sampleX = x + offsetX
          if (
            sampleX >= 0 &&
            sampleX < width &&
            mask[sampleY * width + sampleX]
          ) {
            foreground = true
            break
          }
        }
      }
      dilated[y * width + x] = foreground ? 1 : 0
    }
  }
  return dilated
}

function connectedRegions(mask, width, height) {
  const visited = new Uint8Array(mask.length)
  const queue = new Int32Array(mask.length)
  const minPixels = Math.max(20, Math.floor(mask.length * 0.0007))
  const minBoxArea = mask.length * MIN_CANDIDATE_AREA
  const maxBoxArea = mask.length * MAX_FRAME_AREA_RATIO
  const regions = []

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue

    let head = 0
    let tail = 0
    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    queue[tail] = start
    tail += 1
    visited[start] = 1

    while (head < tail) {
      const index = queue[head]
      head += 1
      const x = index % width
      const y = Math.floor(index / width)
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (!offsetX && !offsetY) continue
          const sampleX = x + offsetX
          const sampleY = y + offsetY
          if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) {
            continue
          }
          const neighbor = sampleY * width + sampleX
          if (mask[neighbor] && !visited[neighbor]) {
            visited[neighbor] = 1
            queue[tail] = neighbor
            tail += 1
          }
        }
      }
    }

    const boxWidth = maxX - minX + 1
    const boxHeight = maxY - minY + 1
    const boxArea = boxWidth * boxHeight
    const aspect = boxWidth / boxHeight
    if (
      tail >= minPixels &&
      boxArea >= minBoxArea &&
      boxArea <= maxBoxArea &&
      boxWidth >= MIN_CANDIDATE_SIDE &&
      boxHeight >= MIN_CANDIDATE_SIDE &&
      aspect >= MIN_ASPECT_RATIO &&
      aspect <= MAX_ASPECT_RATIO &&
      tail / boxArea >= 0.04
    ) {
      regions.push({ x: minX, y: minY, width: boxWidth, height: boxHeight, area: boxArea })
    }
  }

  return regions
}

function mergeNearbyRegions(regions, image) {
  const merged = []
  const gap = Math.max(3, Math.round(Math.min(image.width, image.height) * 0.025))

  for (const region of regions.sort((first, second) => second.area - first.area)) {
    let current = { ...region }
    let mergedRegion = true
    while (mergedRegion) {
      mergedRegion = false
      for (let index = merged.length - 1; index >= 0; index -= 1) {
        const other = merged[index]
        const horizontalGap = Math.max(
          0,
          other.x - (current.x + current.width),
          current.x - (other.x + other.width),
        )
        const verticalGap = Math.max(
          0,
          other.y - (current.y + current.height),
          current.y - (other.y + other.height),
        )
        if (horizontalGap > gap || verticalGap > gap) continue

        const left = Math.min(current.x, other.x)
        const top = Math.min(current.y, other.y)
        const right = Math.max(current.x + current.width, other.x + other.width)
        const bottom = Math.max(current.y + current.height, other.y + other.height)
        current = {
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
          area: (right - left) * (bottom - top),
        }
        merged.splice(index, 1)
        mergedRegion = true
      }
    }
    merged.push(current)
  }

  return merged
}

function colorRegionProposals(image) {
  const mask = dilateMask(makeForegroundMask(image), image.width, image.height)
  const components = connectedRegions(mask, image.width, image.height)
  const padding = Math.round(Math.min(image.width, image.height) * 0.01)
  return mergeNearbyRegions(components, image)
    .map((region) => {
      const left = Math.max(0, region.x - padding)
      const top = Math.max(0, region.y - padding)
      const right = Math.min(image.width, region.x + region.width + padding)
      const bottom = Math.min(image.height, region.y + region.height + padding)
      return { x: left, y: top, width: right - left, height: bottom - top }
    })
    .sort((first, second) => second.width * second.height - first.width * first.height)
    .slice(0, MAX_REGION_PROPOSALS)
}

function hasImageDetail(image, box) {
  let sum = 0
  let squaredSum = 0
  let count = 0
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const x = Math.min(
        image.width - 1,
        box.x + Math.floor(((column + 0.5) * box.width) / 8),
      )
      const y = Math.min(
        image.height - 1,
        box.y + Math.floor(((row + 0.5) * box.height) / 8),
      )
      const value = image.gray[y * image.width + x]
      sum += value
      squaredSum += value * value
      count += 1
    }
  }
  return squaredSum / count - (sum / count) ** 2 >= 64
}

function intersectionOverUnion(first, second) {
  const left = Math.max(first.x, second.x)
  const top = Math.max(first.y, second.y)
  const right = Math.min(first.x + first.width, second.x + second.width)
  const bottom = Math.min(first.y + first.height, second.y + second.height)
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top)
  const union =
    first.width * first.height + second.width * second.height - intersection
  return union ? intersection / union : 0
}

function denominationValue(className) {
  const match = /^(?:Polymer_)?(\d+)_(?:Pesos|Coin|Centavo)(?:_|$)/.exec(className)
  if (!match) throw new Error(`Unknown currency denomination class: ${className}`)
  const amount = Number(match[1])
  return className.includes('_Centavo_') ? amount / 100 : amount
}

export function summarizeDetections(detections) {
  const grouped = new Map()
  for (const detection of detections) {
    const value = denominationValue(detection.className)
    const current = grouped.get(value) || {
      value,
      count: 0,
      subtotal: 0,
      margins: [],
    }
    current.count += 1
    current.subtotal += value
    current.margins.push(detection.margin)
    grouped.set(value, current)
  }

  const results = [...grouped.values()].sort((first, second) => first.value - second.value)
  return {
    results,
    totalValue: results.reduce((sum, result) => sum + result.subtotal, 0),
    count: results.reduce((sum, result) => sum + result.count, 0),
  }
}

export async function detectCurrency(imageSource) {
  const model = await loadCurrencyModel()
  const image = readScaledImage(imageSource)
  const candidates = []
  const regions = colorRegionProposals(image)

  for (const box of regions) {
    const areaRatio = (box.width * box.height) / (image.width * image.height)
    const aspectRatio = box.width / box.height
    if (
      areaRatio < MIN_CANDIDATE_AREA ||
      areaRatio > MAX_FRAME_AREA_RATIO ||
      box.width < MIN_CANDIDATE_SIDE ||
      box.height < MIN_CANDIDATE_SIDE ||
      aspectRatio < MIN_ASPECT_RATIO ||
      aspectRatio > MAX_ASPECT_RATIO ||
      !hasImageDetail(image, box)
    ) {
      continue
    }

    const prediction = predictHogFeatures(
      extractHogFeatures(resizeGrayCrop(image, box)),
      model,
    )
    if (
      prediction.score >= SVM_SCORE_THRESHOLD &&
      prediction.margin >= SVM_MARGIN_THRESHOLD
    ) {
      candidates.push({ ...box, ...prediction })
    }
  }

  candidates.sort((first, second) => second.margin - first.margin)
  const detections = []
  for (const candidate of candidates) {
    if (detections.every((detection) => intersectionOverUnion(detection, candidate) < 0.35)) {
      detections.push(candidate)
    }
  }

  const summary = summarizeDetections(detections)
  return {
    ...summary,
    detected: detections.length > 0,
    model: 'Linear HOG-SVM',
    status: detections.length > 0 ? 'Detected' : 'No Currency Detected',
    detections,
  }
}
