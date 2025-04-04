//
//  RideMessageReceived.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RideMessageReceived: Listener {

    static var listener: String = "ride-message-received"
    
    let ride: String
    let message: String
}
