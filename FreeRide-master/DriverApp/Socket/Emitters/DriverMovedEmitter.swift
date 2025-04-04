//
//  DriverMovedEmitter.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct DriverMovedEmitter: Emitter {

    static let emitter = "ride-driver-moved"

    let latitude: Float
    let longitude: Float
}
