import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const outDir = resolve('public/icons')
mkdirSync(outDir, { recursive: true })

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0d2d5a"/>
      <stop offset="100%" stop-color="#2d7ff9"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#bg)"/>
  <rect x="42" y="42" width="428" height="428" rx="88" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.32)"/>
  <circle cx="256" cy="180" r="118" fill="rgba(255,255,255,0.12)"/>
  <path d="M214 133h88c46 0 80 27 80 70 0 39-27 61-72 71l60 79h-66l-54-74h-20v74h-56V133zm56 48h24c22 0 35 9 35 29 0 18-13 29-35 29h-24v-58z" fill="#ffffff"/>
  <path d="M165 298h182v40H165zm-24 62h230v34H141z" fill="#cfe6ff" opacity="0.9"/>
  <path d="M170 116h172" stroke="#7ec8ff" stroke-width="12" stroke-linecap="round" opacity="0.9"/>
  <path d="M88 340c38 18 76 27 116 27 63 0 108-18 149-57" stroke="#8bd6ff" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.7"/>
</svg>
`

const sizes = [192, 256, 512]

for (const size of sizes) {
  const pngFile = resolve(outDir, `icon-${size}.png`)
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(pngFile)
  console.log(`Created ${pngFile}`)
}

const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="118" fill="#0d2d5a"/>
  <rect x="46" y="46" width="420" height="420" rx="92" fill="#2d7ff9"/>
  <path d="M214 133h88c46 0 80 27 80 70 0 39-27 61-72 71l60 79h-66l-54-74h-20v74h-56V133zm56 48h24c22 0 35 9 35 29 0 18-13 29-35 29h-24v-58z" fill="#ffffff"/>
  <path d="M165 298h182v40H165zm-24 62h230v34H141z" fill="#d9ebff"/>
</svg>
`

const maskableFile = resolve(outDir, 'icon-maskable.png')
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(maskableFile)
console.log(`Created ${maskableFile}`)

writeFileSync(resolve('public/icon.svg'), svg.trim())
console.log('Created public/icon.svg')
