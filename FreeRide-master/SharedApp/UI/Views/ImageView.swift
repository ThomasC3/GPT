//
//  ImageView.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/6/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class ImageView: UIImageView {

    var originalImage: UIImage? {
        didSet {
            image = originalImage
        }
    }

    func setImageColor(_ color: UIColor?) {
        guard let color = color else {
            image = originalImage?.withRenderingMode(.automatic)
            return
        }

        image = originalImage?.withRenderingMode(.alwaysTemplate)
        tintColor = color
    }
}
