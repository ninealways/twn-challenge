import AppKit

func color(_ hex: Int, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: alpha)
}

let args = CommandLine.arguments
guard args.count >= 4 else {
    fputs("Usage: reel_text_renderer.swift output.png text colorHex\n", stderr)
    exit(2)
}

let output = args[1]
let value = args[2]
let colorValue = Int(args[3].replacingOccurrences(of: "#", with: ""), radix: 16) ?? 0xffffff
let image = NSImage(size: NSSize(width: 960, height: 150))
image.lockFocusFlipped(true)

let style = NSMutableParagraphStyle()
style.alignment = .center
style.lineBreakMode = .byWordWrapping
let attrs: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: 46, weight: .bold),
    .foregroundColor: color(colorValue),
    .paragraphStyle: style
]
let attributed = NSAttributedString(string: value, attributes: attrs)
let measured = attributed.boundingRect(with: NSSize(width: 800, height: 100), options: [.usesLineFragmentOrigin, .usesFontLeading])
let panelWidth = min(888, max(220, ceil(measured.width) + 72))
let panelHeight = min(122, max(86, ceil(measured.height) + 34))
let panelX = (960 - panelWidth) / 2
let panelY = (150 - panelHeight) / 2

let panel = NSBezierPath(roundedRect: NSRect(x: panelX, y: panelY, width: panelWidth, height: panelHeight), xRadius: 22, yRadius: 22)
color(0x070a0f, 0.88).setFill()
panel.fill()

let border = NSBezierPath(roundedRect: NSRect(x: panelX + 0.5, y: panelY + 0.5, width: panelWidth - 1, height: panelHeight - 1), xRadius: 22, yRadius: 22)
border.lineWidth = 2
color(0x263241, 0.95).setStroke()
border.stroke()

value.draw(in: NSRect(x: panelX + 36, y: panelY + (panelHeight - measured.height) / 2, width: panelWidth - 72, height: measured.height + 4), withAttributes: attrs)

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Could not render text PNG\n", stderr)
    exit(1)
}

try png.write(to: URL(fileURLWithPath: output))
