//
//  RatingIndicator.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/22/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class RatingIndicator: UIImageView {

    convenience init(value: Int, rating: Int) {
        self.init(image: value <= rating ? #imageLiteral(resourceName: "StarFilledButton") : #imageLiteral(resourceName: "StarUnfilledButton"))
        constrainSize(CGSize(width: 14, height: 14))
    }
}
