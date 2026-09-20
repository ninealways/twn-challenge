import AppKit

func color(_ hex: Int, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(calibratedRed: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: alpha)
}

func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ fill: NSColor, _ radius: CGFloat = 0) {
    let path = NSBezierPath(roundedRect: NSRect(x: x, y: y, width: w, height: h), xRadius: radius, yRadius: radius)
    fill.setFill()
    path.fill()
}

func draw(_ value: String, _ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ size: CGFloat, _ weight: NSFont.Weight, _ fill: NSColor, _ align: NSTextAlignment = .center) {
    let style = NSMutableParagraphStyle()
    style.alignment = align
    style.lineBreakMode = .byWordWrapping
    style.lineSpacing = 6
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: weight),
        .foregroundColor: fill,
        .paragraphStyle: style
    ]
    value.draw(in: NSRect(x: x, y: y, width: width, height: size * 3.2), withAttributes: attrs)
}

func drawBlock(_ value: String, _ centerX: CGFloat, _ y: CGFloat, _ size: CGFloat, _ fill: NSColor, _ textColor: NSColor) {
    let attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: size, weight: .heavy),
        .foregroundColor: textColor
    ]
    let measured = (value as NSString).size(withAttributes: attrs)
    let width = min(900, measured.width + 64)
    let x = centerX - width / 2
    rect(x, y, width, size + 34, fill, 18)
    (value as NSString).draw(
        in: NSRect(x: x + 32, y: y + 15, width: width - 64, height: size + 12),
        withAttributes: attrs
    )
}

func drawWideBlock(_ value: String, _ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ size: CGFloat, _ fill: NSColor, _ textColor: NSColor) {
    rect(x, y, width, size + 42, fill, 20)
    var fontSize = size
    var attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: fontSize, weight: .heavy),
        .foregroundColor: textColor
    ]
    while (value as NSString).size(withAttributes: attrs).width > width - 48 && fontSize > 42 {
        fontSize -= 4
        attrs[.font] = NSFont.systemFont(ofSize: fontSize, weight: .heavy)
    }
    let measured = (value as NSString).size(withAttributes: attrs)
    (value as NSString).draw(
        in: NSRect(x: x + (width - measured.width) / 2, y: y + (size + 42 - measured.height) / 2 - 2, width: measured.width, height: measured.height + 8),
        withAttributes: attrs
    )
}

func drawAdaptiveText(_ value: String, _ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ size: CGFloat, _ minSize: CGFloat, _ weight: NSFont.Weight, _ fill: NSColor) {
    var fontSize = size
    var attrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: fontSize, weight: weight),
        .foregroundColor: fill
    ]
    while (value as NSString).size(withAttributes: attrs).width > width && fontSize > minSize {
        fontSize -= 4
        attrs[.font] = NSFont.systemFont(ofSize: fontSize, weight: weight)
    }
    let measured = (value as NSString).size(withAttributes: attrs)
    (value as NSString).draw(
        in: NSRect(x: x + (width - measured.width) / 2, y: y, width: measured.width, height: measured.height + 8),
        withAttributes: attrs
    )
}

func brushPath(_ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ height: CGFloat) -> NSBezierPath {
    let points: [(CGFloat, CGFloat)] = [
        (0.07, 0.11),
        (0.25, 0.02),
        (0.47, 0.06),
        (0.72, 0.01),
        (0.94, 0.12),
        (0.98, 0.38),
        (0.91, 0.67),
        (0.96, 0.88),
        (0.70, 0.96),
        (0.45, 0.91),
        (0.18, 0.98),
        (0.04, 0.82),
        (0.09, 0.56),
        (0.02, 0.31)
    ]
    let path = NSBezierPath()
    guard let first = points.first else { return path }
    path.move(to: NSPoint(x: x + first.0 * width, y: y + first.1 * height))
    for point in points.dropFirst() {
        path.line(to: NSPoint(x: x + point.0 * width, y: y + point.1 * height))
    }
    path.close()
    return path
}

func drawBrush(_ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ height: CGFloat, _ fill: NSColor) {
    let path = brushPath(x, y, width, height)
    fill.setFill()
    path.fill()
}

func firstMatch(_ pattern: String, in value: String) -> String? {
    guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return nil }
    let range = NSRange(value.startIndex..<value.endIndex, in: value)
    guard let match = regex.firstMatch(in: value, options: [], range: range),
          let resultRange = Range(match.range(at: 1), in: value) else { return nil }
    return String(value[resultRange]).trimmingCharacters(in: .whitespacesAndNewlines)
}

func drawAspectFill(_ image: NSImage, in target: NSRect, zoom: CGFloat = 1) {
    let sourceSize = image.size
    guard sourceSize.width > 0, sourceSize.height > 0 else { return }
    let scale = max(target.width / sourceSize.width, target.height / sourceSize.height)
    let sourceWidth = target.width / scale / zoom
    let sourceHeight = target.height / scale / zoom
    let source = NSRect(
        x: (sourceSize.width - sourceWidth) / 2,
        y: (sourceSize.height - sourceHeight) / 2,
        width: sourceWidth,
        height: sourceHeight
    )
    image.draw(in: target, from: source, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: nil)
}

func drawAspectFit(_ image: NSImage, in target: NSRect, alpha: CGFloat = 1) {
    let sourceSize = image.size
    guard sourceSize.width > 0, sourceSize.height > 0 else { return }
    let scale = min(target.width / sourceSize.width, target.height / sourceSize.height)
    let width = sourceSize.width * scale
    let height = sourceSize.height * scale
    let rect = NSRect(x: target.midX - width / 2, y: target.midY - height / 2, width: width, height: height)
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: alpha, respectFlipped: true, hints: nil)
}

let args = CommandLine.arguments
guard args.count >= 5 else {
    fputs("Usage: reel_screen_renderer.swift output.png title subtitle footer\n", stderr)
    exit(2)
}

let output = args[1]
let title = args[2]
let subtitle = args[3]
let footer = args[4]
let backgroundPath = args.count > 5 ? args[5] : nil
let backgroundImage = backgroundPath.flatMap { NSImage(contentsOfFile: $0) }
let logoImage = NSImage(contentsOfFile: "public/reel-assets/tradewithnine-logo.png")

let image = NSImage(size: NSSize(width: 1080, height: 1920))
image.lockFocusFlipped(true)

let bg = color(0x070a0f)
let panel = color(0x0d121a)
let panelSoft = color(0x131b26)
let green = color(0x2fea7b)
let text = color(0xf4f7fb)
let muted = color(0xa7b0bf)
let grid = color(0x263241)

bg.setFill()
NSRect(x: 0, y: 0, width: 1080, height: 1920).fill()

if let backgroundImage {
    let purple = color(0x6d28ff)
    let white = color(0xffffff)
    let ink = color(0x1f1636)

    white.setFill()
    NSRect(x: 0, y: 0, width: 1080, height: 1920).fill()
    drawAspectFill(backgroundImage, in: NSRect(x: 0, y: 0, width: 1080, height: 1920), zoom: 1.18)
    rect(0, 0, 1080, 1920, white.withAlphaComponent(0.34))
    rect(-90, -70, 360, 360, purple.withAlphaComponent(0.12), 180)
    rect(836, 1656, 340, 340, purple.withAlphaComponent(0.1), 170)
    rect(40, 40, 1000, 1840, color(0xffffff, 0.12), 48)

    let rawLines = title
        .replacingOccurrences(of: "|", with: "\n")
        .components(separatedBy: "\n")
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() }
        .filter { !$0.isEmpty }
    let pnlValue = firstMatch("P&L\\s*([^|\\n]+)", in: subtitle)?.uppercased()
    let disciplineValue = firstMatch("DISCIPLINE\\s*([^|\\n]+)", in: subtitle)?.uppercased()
    let dayLine = rawLines.first ?? "TRADEWITHNINE"
    let isProfit = pnlValue.map { !$0.contains("-") } ?? !rawLines.contains("LOSS")
    let pnlColor = isProfit ? color(0x10b981) : color(0xef4444)
    let resultLine = rawLines.count > 1 ? rawLines[1] : (isProfit ? "PROFIT DAY" : "LOSS DAY")
    let cardY = CGFloat(600)
    let cardX = CGFloat(120)
    let cardW = CGFloat(840)
    let cardH = CGFloat(560)
    let resultText = resultLine == "WIN" ? "PROFIT DAY" : resultLine == "LOSS" ? "LOSS DAY" : resultLine

    drawBrush(cardX, cardY, cardW, cardH, pnlColor.withAlphaComponent(0.92))
    rect(cardX + 284, cardY + 66, 272, 56, color(0xffffff, 0.22), 28)
    draw(resultText, cardX + 304, cardY + 82, 232, 24, .heavy, white)
    drawAdaptiveText(dayLine, cardX + 130, cardY + 158, cardW - 260, 66, 44, .heavy, white)
    if let pnlValue {
        drawAdaptiveText("P&L \(pnlValue)", cardX + 52, cardY + 255, cardW - 104, 100, 54, .heavy, white)
    } else if rawLines.count > 1 {
        drawAdaptiveText(rawLines[1], cardX + 52, cardY + 255, cardW - 104, 84, 48, .heavy, white)
    }

    let ruleText = disciplineValue.map { "DISCIPLINE \($0) | RULES FOLLOWED" } ?? "PROCESS OVER HYPE | RULES FOLLOWED"
    rect(cardX + 98, cardY + 410, cardW - 196, 76, color(0xffffff, 0.88), 22)
    drawAdaptiveText(ruleText, cardX + 128, cardY + 430, cardW - 256, 30, 20, .bold, ink)

    if let logoImage {
        drawAspectFit(logoImage, in: NSRect(x: 444, y: 168, width: 192, height: 192), alpha: 0.95)
    }
} else {
    rect(88, 292, 904, 1320, panel, 42)
    rect(128, 334, 824, 2, grid, 1)
    rect(128, 1518, 824, 2, grid, 1)
    rect(128, 382, 146, 12, green, 6)

    if let logoImage {
        drawAspectFit(logoImage, in: NSRect(x: 444, y: 168, width: 192, height: 192), alpha: 0.95)
    }
    draw("TradeWithNine", 120, 480, 840, 50, .heavy, text)
    draw(title, 118, 650, 844, 92, .heavy, text)
    draw(subtitle, 150, 884, 780, 48, .semibold, muted)

    rect(210, 1280, 660, 130, panelSoft, 28)
    draw(footer, 240, 1318, 600, 38, .semibold, green)

    draw("Educational Content Only | Trading Involves Risk", 110, 1712, 860, 30, .regular, muted)
}

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Could not render PNG\n", stderr)
    exit(1)
}

try png.write(to: URL(fileURLWithPath: output))
