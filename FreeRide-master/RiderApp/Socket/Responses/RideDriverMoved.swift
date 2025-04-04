//
//  RideDriverMoved.swift
//  RiderApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RideDriverMoved: Listener {

    static var listener: String = "ride-driver-moved"

    let latitude: Float
    let longitude: Float
    let ride: String
    let direction: Int?
}
