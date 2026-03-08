const { nativeImage } = require('electron')

// Build a circular icon from raw RGBA pixels — no dependencies needed
function createCircleIcon(r, g, b) {
    const size = process.platform === 'win32' ? 16 : 22
    const data = Buffer.alloc(size * size * 4)
    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 1.5

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - cx
            const dy = y - cy
            const dist = Math.sqrt(dx * dx + dy * dy)
            const i = (y * size + x) * 4
            if (dist <= radius) {
                const alpha = dist > radius - 1 ? Math.round((radius - dist) * 255) : 255
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
                data[i + 3] = alpha
            }
        }
    }
    return nativeImage.createFromBuffer(data, { width: size, height: size })
}

const icons = {
    off: createCircleIcon(100, 100, 120), // grey
    listening: createCircleIcon(74, 222, 128),  // green
    processing: createCircleIcon(251, 146, 60),  // orange
    reading: createCircleIcon(96, 165, 250),  // blue
}

module.exports = { icons }
