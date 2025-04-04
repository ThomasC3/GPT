//
//  AddressTextField.swift
//  RiderApp
//
//  Created by Andrew Boryk on 12/30/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

class AddressTextField: TextField {

    override func applyStyle() {
        font = Theme.Fonts.textField1
        textColor = Theme.Colors.blueGray
        tintColor = Theme.Colors.blueGray
    }
}
