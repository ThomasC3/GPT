//
//  MenuItem.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/21/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

struct MenuItem {

    let title: String
    let image: UIImage
    let index: Int

    init(title: String, image: UIImage, index: Int) {
        self.title = title
        self.image = image
        self.index = index
    }
}
