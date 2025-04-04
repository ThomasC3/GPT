//
//  RideMessageEmitter.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RideMessageEmitter: Emitter {

    static let emitter = "ride-message"
    
    let ride: String
    let message: String
}
