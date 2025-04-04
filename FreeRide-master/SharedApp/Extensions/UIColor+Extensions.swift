//
//  UIColor+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/4/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

public extension UIColor {

    convenience init(hex: String) {
        var color: UInt32 = 0

        let scanner = Scanner(string: hex)
        scanner.scanHexInt32(&color)

        let mask = 0x000000FF
        let r = Int(color >> 16) & mask
        let g = Int(color >> 8) & mask
        let b = Int(color) & mask

        let red = CGFloat(r) / 255
        let green = CGFloat(g) / 255
        let blue = CGFloat(b) / 255

        self.init(red: red, green: green, blue: blue, alpha: 1)
    }

    /**
     Hex string of a UIColor instance, throws error.

     - parameter includeAlpha: Whether the alpha should be included.
     */
    func hexStringThrows(_ includeAlpha: Bool = true) throws -> String  {
        var r: CGFloat = 0
        var g: CGFloat = 0
        var b: CGFloat = 0
        var a: CGFloat = 0
        self.getRed(&r, green: &g, blue: &b, alpha: &a)

        guard r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1 else {
            let error = UIColorInputError.unableToOutputHexStringForWideDisplayColor
            print(error.localizedDescription)
            throw error
        }

        if (includeAlpha) {
            return String(format: "#%02X%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255), Int(a * 255))
        } else {
            return String(format: "#%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255))
        }
    }

    /**
     Hex string of a UIColor instance, fails to empty string.

     - parameter includeAlpha: Whether the alpha should be included.
     */
    func hexString(_ includeAlpha: Bool = true) -> String  {
        guard let hexString = try? hexStringThrows(includeAlpha) else {
            return ""
        }
        return hexString
    }
}

public enum UIColorInputError: Error {

    case missingHashMarkAsPrefix(String)
    case unableToScanHexValue(String)
    case mismatchedHexStringLength(String)
    case unableToOutputHexStringForWideDisplayColor
}

extension UIColorInputError: LocalizedError {

    public var errorDescription: String? {
        switch self {
        case .missingHashMarkAsPrefix(let hex):
            return "Invalid RGB string, missing '#' as prefix in \(hex)"

        case .unableToScanHexValue(let hex):
            return "Scan \(hex) error"

        case .mismatchedHexStringLength(let hex):
            return "Invalid RGB string from \(hex), number of characters after '#' should be either 3, 4, 6 or 8"

        case .unableToOutputHexStringForWideDisplayColor:
            return "Unable to output hex string for wide display color"
        }
    }
}

