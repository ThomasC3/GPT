//
//  SwiftUITheme.swift
//  FreeRide
//

import Foundation
import SwiftUI

struct SwiftUITheme {
    
    struct Fonts {
        static let largeTitle1 = Font.custom("OpenSans-Bold", size: 22)
        static let subtitle9 = Font.custom("OpenSans-Regular", size: 10)
        static let subtitle2 = Font.custom("OpenSans-Regular", size: 12)
        static let body6 = Font.custom("OpenSans-Bold", size: 12)
        static let subtitle3 = Font.custom("OpenSans-Regular", size: 14)
        static let subtitle8 = Font.custom("OpenSans-Semibold", size: 16)
        static let body2 = Font.custom("OpenSans-Regular", size: 14)
        static let body3 = Font.custom("OpenSans-Bold", size: 14)
        static let subtitle1 = Font.custom("OpenSans-Regular", size: 16)
        static let body7 = Font.custom("OpenSans-Regular", size: 16)
        static let textField1 = Font.custom("OpenSans-Regular", size: 16)
        static let body5 = Font.custom("OpenSans-Bold", size: 16)
        static let body8 = Font.custom("OpenSans-Bold", size: 16)
        static let subtitle6 = Font.custom("OpenSans-Semibold", size: 18)
        static let title1 = Font.custom("OpenSans-Regular", size: 22)
        static let subtitle5 = Font.custom("OpenSans-Regular", size: 22)
        static let subtitle7 = Font.custom("OpenSans-Semibold", size: 22)
        static let stepperTitle = Font.custom("OpenSans-Regular", size: 26)

        static let subtitle4 = Font.custom("Montserrat-Regular", size: 14)
        static let body4 = Font.custom("Montserrat-Regular", size: 14)
        static let body1 = Font.custom("Montserrat-Medium", size: 16)
        static let menuToggleItemTitle = Font.custom("Montserrat-Medium", size: 18)
        static let titleNavigation = Font.custom("Montserrat-Bold", size: 18)
        static let title3 = Font.custom("Montserrat-Regular", size: 22)
        static let menuItemTitle = Font.custom("Montserrat-Medium", size: 22)
        static let title2 = Font.custom("Montserrat-Regular", size: 30)
        static let title4 = Font.custom("Montserrat-Regular", size: 40)
        
        static let buttonPrimary = Font.custom("OpenSans-Semibold", size: 16)
        static let buttonSecondary = Font.custom("Montserrat-Medium", size: 16)
        static let buttonTertiary = Font.custom("Montserrat-Medium", size: 14)
    }
    
    struct Colors {
        static let blue = Color(hex: "3366FF")
        static let white = Color(hex: "FFFFFF")
        static let blueGray = Color(hex: "323643")
        static let darkGray = Color(hex: "606470")
        static let gray = Color(hex: "B9B8B9")
        static let lightGray = Color(hex: "CED0D2")
        static let locationGray = Color(hex: "A8A8A8")
        static let backgroundGray = Color(hex: "F6F6F6")
        static let lightRed = Color(hex: "E49696")
        static let teal = Color(hex: "1BE5BF")
        static let seaFoam = Color(hex: "0CA882") //green
        static let kelp = Color(hex: "08513E") //dark green
        static let narvik = Color(hex: "F0F9EF") //light green for background
        static let tangerine = Color(hex: "FF9858")
        static let sunshine = Color(hex: "FFD32A")
        static let coolGray = Color(hex: "E1E2DF")
        static let fireBrick = Color(hex: "AD2E24")
        static let placeholderGray = Color(hex: "C7C7CD")
        static let fluxRed = Color(hex: "FF0000")
        static let fluxYellow = Color(hex: "FFD32A")
        static let fluxGreen = Color(hex: "F1F9F1")
    }
}


extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
