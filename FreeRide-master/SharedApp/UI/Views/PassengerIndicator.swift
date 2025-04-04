//
//  PassengerIndicator.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/22/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class PassengerIndicator: UIImageView {

    convenience init() {
        self.init(image: #imageLiteral(resourceName: "RiderImage"))
        constrainSize(CGSize(width: 10, height: 22))
        contentMode = .center
    }
}
