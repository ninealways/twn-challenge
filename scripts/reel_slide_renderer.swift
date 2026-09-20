import AppKit

func color(_ hex: Int, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: alpha)
}

func rect(_ frame: NSRect, _ fill: NSColor, _ radius: CGFloat) {
    let path = NSBezierPath(roundedRect: frame, xRadius: radius, yRadius: radius)
    fill.setFill()
    path.fill()
}

func draw(_ value: String, frame: NSRect, size: CGFloat, weight: NSFont.Weight, fill: NSColor) {
    let style = NSMutableParagraphStyle()
    style.alignment = .center
    style.lineBreakMode = .byWordWrapping
    style.lineSpacing = 8
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: fill,
        .paragraphStyle: style
    ]
    value.draw(in: frame, withAttributes: attributes)
}

func drawAspectFill(_ image: NSImage, in target: NSRect) {
    let sourceSize = image.size
    guard sourceSize.width > 0, sourceSize.height > 0 else { return }
    let scale = max(target.width / sourceSize.width, target.height / sourceSize.height)
    let sourceWidth = target.width / scale
    let sourceHeight = target.height / scale
    let source = NSRect(
        x: (sourceSize.width - sourceWidth) / 2,
        y: (sourceSize.height - sourceHeight) / 2,
        width: sourceWidth,
        height: sourceHeight
    )
    image.draw(in: target, from: source, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: nil)
}

let args = CommandLine.arguments
guard args.count >= 5 else {
    fputs("Usage: reel_slide_renderer.swift output.png title subtitle position [background]\n", stderr)
    exit(2)
}

let output = args[1]
let title = args[2]
let subtitle = args[3]
let position = args[4]
let background = args.count > 5 ? NSImage(contentsOfFile: args[5]) : nil

let image = NSImage(size: NSSize(width: 1080, height: 1920))
image.lockFocusFlipped(true)

color(0x000000).setFill()
NSRect(x: 0, y: 0, width: 1080, height: 1920).fill()
if let background {
    drawAspectFill(background, in: NSRect(x: 0, y: 0, width: 1080, height: 1920))
    rect(NSRect(x: 0, y: 0, width: 1080, height: 1920), color(0x000000, 0.12), 0)
}

let panelY: CGFloat
switch position {
case "top": panelY = 170
case "bottom": panelY = 1320
default: panelY = 745
}

let panel = NSRect(x: 70, y: panelY, width: 940, height: 430)
rect(panel, color(0x101820, background == nil ? 0.92 : 0.74), 34)
draw(title, frame: NSRect(x: 120, y: panelY + 92, width: 840, height: 180), size: 72, weight: .heavy, fill: color(0xf4f7fb))
draw(subtitle, frame: NSRect(x: 145, y: panelY + 250, width: 790, height: 120), size: 34, weight: .medium, fill: color(0xd6dce5))

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Could not render slide PNG\n", stderr)
    exit(1)
}

try png.write(to: URL(fileURLWithPath: output))
