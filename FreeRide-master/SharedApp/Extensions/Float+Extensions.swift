//
//  Float+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 2/16/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

extension Float {

    /// Rounds the double to decimal places value
    func rounded(toPlaces places:Int) -> Float {
        let divisor = pow(10.0, Float(places))
        return (self * divisor).rounded() / divisor
    }
}
