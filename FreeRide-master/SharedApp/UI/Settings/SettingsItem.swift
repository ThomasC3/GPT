//
//  SettingsItem.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/30/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

struct SettingsItem {

    struct Toggle {

        let onTitle: String
        let offTitle: String
        let isEnabled: Bool
        let value: Bool
        let handler: () -> Void
    }

    let id: String
    let image: UIImage?
    let title: String
    let toggle: Toggle?

    init(id: String, image: UIImage, title: String) {
        self.id = id
        self.image = image
        self.title = title
        self.toggle = nil
    }

    init(id: String, image: UIImage, toggle: Toggle) {
        self.id = id
        self.image = image
        self.title = toggle.onTitle
        self.toggle = toggle
    }
    
    init(id: String, toggle: Toggle) {
        self.id = id
        self.image = nil
        self.title = toggle.onTitle
        self.toggle = toggle
    }
}
