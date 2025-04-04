//
//  RiderRequestCallEmitter.swift
//  DriverApp
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RiderRequestCallEmitter: Emitter {

    static let emitter = "rider-request-call"
    
    let ride: String
}
