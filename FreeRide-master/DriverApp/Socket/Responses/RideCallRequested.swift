//
//  RideCallRequested.swift
//  DriverApp
//
//  Created by Andrew Boryk on 1/11/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RideCallRequested: Listener {

    static var listener: String = "ride-call-requested"

    let ride: String
}
