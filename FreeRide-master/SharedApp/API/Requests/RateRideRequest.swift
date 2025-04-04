//
//  RateRideRequest.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/17/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import Foundation

struct RateRideRequest: Codable {

    let ride: String
    let rating: Int
    let feedback: String?
}
