//
//  Theme.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/4/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

struct Theme {

    struct Colors {

        /// #3366FF (51, 102, 255)
        static let blue = #colorLiteral(red: 0.2, green: 0.4, blue: 1, alpha: 1)

        /// #FFFFFF (255, 255, 255)
        static let white = #colorLiteral(red: 1, green: 1, blue: 1, alpha: 1)

        /// #323643 (50, 54, 67)
        static let blueGray = #colorLiteral(red: 0.1960784314, green: 0.2117647059, blue: 0.262745098, alpha: 1)

        /// #606470 (96, 100, 112)
        static let darkGray = #colorLiteral(red: 0.3764705882, green: 0.3921568627, blue: 0.4392156863, alpha: 1)

        /// #B9B8B9 (185, 184, 185)
        static let gray = #colorLiteral(red: 0.7254901961, green: 0.7215686275, blue: 0.7254901961, alpha: 1)

        /// #CED0D2 (206, 208, 210)
        static let lightGray = #colorLiteral(red: 0.8078431373, green: 0.8156862745, blue: 0.8235294118, alpha: 1)

        /// #A8A8A8 (168, 168, 168)
        static let locationGray = #colorLiteral(red: 0.6588235294, green: 0.6588235294, blue: 0.6588235294, alpha: 1)

        /// #F6F6F6 (246, 246, 246)
        static let backgroundGray = #colorLiteral(red: 0.9647058824, green: 0.9647058824, blue: 0.9647058824, alpha: 1)
        

        /// #E49696 (228, 150, 150)
        static let lightRed = #colorLiteral(red: 0.8941176471, green: 0.5882352941, blue: 0.5882352941, alpha: 1)

        /// #1BE5BF (27, 229, 191)
        static let teal = #colorLiteral(red: 0.1058823529, green: 0.8980392157, blue: 0.7490196078, alpha: 1)
        
        //brand guidelines colours
         
        static let seaFoam = #colorLiteral(red: 0.04705882353, green: 0.6588235294, blue: 0.5098039216, alpha: 1)
        static let kelp = #colorLiteral(red: 0.03137254902, green: 0.3176470588, blue: 0.2431372549, alpha: 1)
        static let tangerine = #colorLiteral(red: 1, green: 0.5960784314, blue: 0.3450980392, alpha: 1)
        static let sunshine = #colorLiteral(red: 1, green: 0.8274509804, blue: 0.1647058824, alpha: 1)
        static let coolGray = #colorLiteral(red: 0.8823529412, green: 0.8862745098, blue: 0.8745098039, alpha: 1)
        static let fireBrick = #colorLiteral(red: 0.6784313725, green: 0.1803921569, blue: 0.1411764706, alpha: 1)
        
        static let placeholderGray = #colorLiteral(red: 0.7803921569, green: 0.7803921569, blue: 0.8039215686, alpha: 1)
        
        static let fluxRed = #colorLiteral(red: 1, green: 0, blue: 0, alpha: 1)
        static let fluxYellow = #colorLiteral(red: 1, green: 0.8274509804, blue: 0.1647058824, alpha: 1)
        static let fluxGreen = #colorLiteral(red: 0.9450980392, green: 0.9764705882, blue: 0.9450980392, alpha: 1)
        
    }

    struct Fonts {

        // Label
        static let title1 = UIFont(style: .openSansRegular, size: 22)
        static let title2 = UIFont(style: .montserratRegular, size: 30)
        static let title3 = UIFont(style: .montserratRegular, size: 22)
        static let title4 = UIFont(style: .montserratRegular, size: 40)
        static let subtitle1 = UIFont(style: .openSansRegular, size: 16)
        static let subtitle2 = UIFont(style: .openSansRegular, size: 12)
        static let subtitle3 = UIFont(style: .openSansRegular, size: 14)
        static let subtitle4 = UIFont(style: .montserratRegular, size: 14)
        static let subtitle5 = UIFont(style: .openSansRegular, size: 22)
        static let subtitle6 = UIFont(style: .openSansSemibold, size: 18)
        static let subtitle7 = UIFont(style: .openSansSemibold, size: 22)
        static let subtitle8 = UIFont(style: .openSansSemibold, size: 14)
        static let body1 = UIFont(style: .montserratMedium, size: 16)
        static let body2 = UIFont(style: .openSansRegular, size: 14)
        static let body3 = UIFont(style: .openSansBold, size: 14)
        static let body4 = UIFont(style: .montserratRegular, size: 14)
        static let body5 = UIFont(style: .openSansBold, size: 16)
        static let body6 = UIFont(style: .openSansBold, size: 12)
        static let body7 = UIFont(style: .openSansRegular, size: 16)
        static let body8 = UIFont(style: .openSansBold, size: 16)
        static let textField1 = UIFont(style: .openSansRegular, size: 16)
        static let titleNavigation = UIFont(style: .montserratBold, size: 18)
        static let stepperTitle = UIFont(style: .openSansRegular, size: 26)
        static let menuItemTitle = UIFont(style: .montserratMedium, size: 22)
        static let menuToggleItemTitle = UIFont(style: .montserratMedium, size: 18)
        
        // Button
        static let buttonPrimary = UIFont(style: .openSansSemibold, size: 16)
        static let buttonSecondary = UIFont(style: .montserratMedium, size: 16)
        static let buttonTertiary = UIFont(style: .montserratMedium, size: 14)
    }
}

extension UIFont {

    enum CustomFont: String {
        case montserratRegular = "Montserrat-Regular"
        case montserratMedium = "Montserrat-Medium"
        case montserratBold = "Montserrat-Bold"
        case openSansRegular = "OpenSans-Regular"
        case openSansSemibold = "OpenSans-Semibold"
        case openSansBold = "OpenSans-Bold"
    }

    convenience init?(style: CustomFont, size: CGFloat) {
        self.init(name: style.rawValue, size: size)
    }
}
